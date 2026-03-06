#include "PluginProcessor.h"
#include "PluginEditor.h"

FunkhausAudioProcessor::FunkhausAudioProcessor()
#ifndef JucePlugin_PreferredChannelConfigurations
    : AudioProcessor(
          BusesProperties()
#if !JucePlugin_IsMidiEffect
#if !JucePlugin_IsSynth
              .withInput("Input", juce::AudioChannelSet::stereo(), true)
#endif
              .withOutput("Output", juce::AudioChannelSet::stereo(), true)
#endif
              ),
      apvts(*this, nullptr, "Parameters", createParameterLayout())
#endif
{
}

FunkhausAudioProcessor::~FunkhausAudioProcessor() {}

const juce::String FunkhausAudioProcessor::getName() const {
  return JucePlugin_Name;
}

bool FunkhausAudioProcessor::acceptsMidi() const { return false; }
bool FunkhausAudioProcessor::producesMidi() const { return false; }
bool FunkhausAudioProcessor::isMidiEffect() const { return false; }
double FunkhausAudioProcessor::getTailLengthSeconds() const { return 0.0; }

int FunkhausAudioProcessor::getNumPrograms() { return 1; }
int FunkhausAudioProcessor::getCurrentProgram() { return 0; }
void FunkhausAudioProcessor::setCurrentProgram(int index) {}
const juce::String FunkhausAudioProcessor::getProgramName(int index) {
  return {};
}
void FunkhausAudioProcessor::changeProgramName(int index,
                                               const juce::String &newName) {}

// --- PARAMETERS ---
juce::AudioProcessorValueTreeState::ParameterLayout
FunkhausAudioProcessor::createParameterLayout() {
  juce::AudioProcessorValueTreeState::ParameterLayout layout;

  // Space Types (Algorithm) - Kept for legacy/fallback but overridden by 3D
  // mostly
  juce::StringArray spaces;
  spaces.add("Cathedral");
  spaces.add("Hall");
  spaces.add("Plate");
  spaces.add("Chamber");
  spaces.add("Spring");
  spaces.add("Shimmer");
  spaces.add("Cone");
  spaces.add("Non-Linear");
  layout.add(std::make_unique<juce::AudioParameterChoice>("space", "Space",
                                                          spaces, 0));

  // Character Modes
  juce::StringArray chars;
  chars.add("Clean");
  chars.add("Glimmer"); // Soft Chorus/Mod -> Expanded GlimmerEngine
  chars.add("Grit");    // Lo-Fi Saturation
  layout.add(std::make_unique<juce::AudioParameterChoice>("char", "Character",
                                                          chars, 0));

  // Controls (Base values modified by 3D)
  layout.add(std::make_unique<juce::AudioParameterFloat>(
      "predelay", "Pre-Delay", 0.0f, 200.0f, 0.0f)); // ms
  layout.add(std::make_unique<juce::AudioParameterFloat>("decay", "Decay", 0.0f,
                                                         100.0f, 50.0f));
  layout.add(std::make_unique<juce::AudioParameterFloat>("size", "Size", 0.0f,
                                                         100.0f, 50.0f));
  layout.add(std::make_unique<juce::AudioParameterFloat>("width", "Width", 0.0f,
                                                         100.0f, 100.0f));
  layout.add(std::make_unique<juce::AudioParameterFloat>(
      "damping", "Damping", 0.0f, 100.0f, 20.0f)); // 0=Bright, 100=Dark

  // Tone Shaping
  layout.add(std::make_unique<juce::AudioParameterFloat>(
      "hipass", "High Pass",
      juce::NormalisableRange<float>(20.0f, 1000.0f, 1.0f, 0.4f), 100.0f));

  layout.add(std::make_unique<juce::AudioParameterFloat>("mix", "Mix", 0.0f,
                                                         100.0f, 30.0f));

  layout.add(std::make_unique<juce::AudioParameterBool>(
      "nonlinear_mode", "Non-Linear Mode", false));

  // --- NEW 3D DRIVEN PARAMS ---
  layout.add(std::make_unique<juce::AudioParameterFloat>(
      "roomVolume", "roomVolume", 0.0f, 100.0f, 50.0f));
  layout.add(std::make_unique<juce::AudioParameterFloat>(
      "micDistance", "micDistance", 0.0f, 100.0f, 20.0f));
  layout.add(std::make_unique<juce::AudioParameterFloat>("micPan", "micPan",
                                                         0.0f, 100.0f, 50.0f));
  layout.add(std::make_unique<juce::AudioParameterInt>("micbrand", "micbrand",
                                                       0, 3, 0));

  return layout;
}

void FunkhausAudioProcessor::prepareToPlay(double sampleRate,
                                           int samplesPerBlock) {
  juce::dsp::ProcessSpec spec;
  spec.sampleRate = sampleRate;
  spec.maximumBlockSize = samplesPerBlock;
  spec.numChannels = getTotalNumOutputChannels();

  reverb.prepare(spec);

  // Tone Shaping - Prepare both channels
  for (auto &f : highPassFilters) {
    f.prepare(spec);
    f.setType(juce::dsp::StateVariableTPTFilterType::highpass);
  }

  // Prepare New Engines
  juce::dsp::ProcessSpec monoSpec = spec;
  monoSpec.numChannels = 1;
  for (int c = 0; c < 2; ++c) {
    micModellers[c].prepare(monoSpec);
    glimmerEngines[c].prepare(monoSpec);
  }

  // Pre-Delay
  preDelayLine.prepare(spec);
  preDelayLine.setMaximumDelayInSamples(sampleRate *
                                        2.0); // Max 2s just in case
}

void FunkhausAudioProcessor::releaseResources() {}

bool FunkhausAudioProcessor::isBusesLayoutSupported(
    const BusesLayout &layouts) const {
  return true;
}

void FunkhausAudioProcessor::processBlock(juce::AudioBuffer<float> &buffer,
                                          juce::MidiBuffer &midiMessages) {
  juce::ScopedNoDenormals noDenormals;
  auto totalNumInputChannels = getTotalNumInputChannels();
  auto totalNumOutputChannels = getTotalNumOutputChannels();

  // Clear extra channels
  for (auto i = totalNumInputChannels; i < totalNumOutputChannels; ++i)
    buffer.clear(i, 0, buffer.getNumSamples());

  // 1. Update Parameters (Base + 3D Overrides)
  float hpFreq = *apvts.getRawParameterValue("hipass");
  float decayBase = *apvts.getRawParameterValue("decay") / 100.0f;
  float sizeBase = *apvts.getRawParameterValue("size") / 100.0f;
  float damping = *apvts.getRawParameterValue("damping") / 100.0f;
  float widthBase = *apvts.getRawParameterValue("width") / 100.0f;
  float mix = *apvts.getRawParameterValue("mix") / 100.0f;

  // 3D Parameters
  float roomVol =
      *apvts.getRawParameterValue("roomVolume") / 100.0f; // 0.0 - 1.0 (Huge)
  float micDist = *apvts.getRawParameterValue("micDistance") /
                  100.0f; // 0.0 (Wall) - 1.0 (Center)
  float micPan = *apvts.getRawParameterValue("micPan") / 100.0f; // 0.0 - 1.0
  int micBrand = (int)*apvts.getRawParameterValue("micbrand");

  int spaceIdx = (int)*apvts.getRawParameterValue("space");
  int charIdx = (int)*apvts.getRawParameterValue("char");

  // --- Space Characteristics & 3D Modifiers ---
  // If the user draws a huge room (roomVol > 0.8), it overrides the base size
  // heavily.
  float targetSize =
      juce::jlimit(0.0f, 0.98f, sizeBase * 0.3f + roomVol * 0.7f);
  float targetDecay =
      juce::jlimit(0.0f, 0.98f, decayBase * 0.4f + roomVol * 0.6f);

  // Microphone close to wall (micDist ~ 0) = short pre-delay, high early
  // reflections -> mimicked with damping Microphone far (micDist ~ 1) = long
  // pre-delay
  float targetPredelayTime =
      micDist * 160.0f; // up to 160ms predelay based on physics

  // Pan affects width and balance
  float stereoBalanceOffset = (micPan - 0.5f) * 2.0f; // -1 to 1
  float targetWidth = juce::jlimit(
      0.0f, 1.0f, widthBase * (1.0f - std::abs(stereoBalanceOffset) * 0.5f));

  // Set Reverb Params
  reverbParams.roomSize = targetSize;
  reverbParams.damping = juce::jlimit(0.0f, 1.0f, damping);
  reverbParams.width = targetWidth;

  reverbParams.freezeMode = 0.0f;
  reverbParams.dryLevel = 0.0f; // We handle mix externally
  reverbParams.wetLevel = 1.0f;
  reverb.setParameters(reverbParams);

  // Set Pre-Delay
  float preDelaySamples = (targetPredelayTime / 1000.0f) * getSampleRate();
  preDelayLine.setDelay(preDelaySamples);

  // 2. Process

  // Save Dry
  juce::AudioBuffer<float> dryBuffer;
  dryBuffer.makeCopyOf(buffer);

  // Apply HPF (Tone Shaping) per channel
  for (int c = 0; c < buffer.getNumChannels(); ++c) {
    if (c < 2) {
      highPassFilters[c].setCutoffFrequency(hpFreq);

      juce::dsp::AudioBlock<float> block(buffer.getArrayOfWritePointers() + c,
                                         1, buffer.getNumSamples());
      juce::dsp::ProcessContextReplacing<float> context(block);
      highPassFilters[c].process(context);
    }
  }

  // 2.1 Pre-Delay
  juce::dsp::AudioBlock<float> preDelayBlock(buffer);
  juce::dsp::ProcessContextReplacing<float> preDelayCtx(preDelayBlock);
  preDelayLine.process(preDelayCtx);

  // 2.2 Reverb Generation (Stereo)
  juce::dsp::AudioBlock<float> block(buffer);
  juce::dsp::ProcessContextReplacing<float> ctx(block);
  reverb.process(ctx);

  // 2.3 Microphone Profile & 2.4 Character (Glimmer)
  // Process both per-channel safely
  for (int c = 0; c < std::min((int)buffer.getNumChannels(), 2); ++c) {
    juce::dsp::AudioBlock<float> chBlock(buffer.getArrayOfWritePointers() + c,
                                         1, buffer.getNumSamples());
    juce::dsp::ProcessContextReplacing<float> chCtx(chBlock);

    micModellers[c].setModel(micBrand);
    micModellers[c].process(chCtx);

    if (charIdx == 1 || spaceIdx == 5) {
      glimmerEngines[c].setAmount(charIdx == 1 ? 0.7f : 1.0f);
      glimmerEngines[c].process(chCtx);
    }
  }

  // 2.5 Grit (Manual Saturation on tail)
  if (charIdx == 2) {
    auto *chL = buffer.getWritePointer(0);
    auto *chR =
        buffer.getNumChannels() > 1 ? buffer.getWritePointer(1) : nullptr;

    for (int i = 0; i < buffer.getNumSamples(); ++i) {
      float s = chL[i];
      s *= 2.0f;
      s = std::tanh(s);
      s = std::round(s * 16.0f) / 16.0f;
      chL[i] = s * 0.5f;

      if (chR) {
        float sR = chR[i];
        sR *= 2.0f;
        sR = std::tanh(sR);
        sR = std::round(sR * 16.0f) / 16.0f;
        chR[i] = sR * 0.5f;
      }
    }
  }

  // 2.6 Microphone Panning
  if (totalNumOutputChannels > 1) {
    auto *chL = buffer.getWritePointer(0);
    auto *chR = buffer.getWritePointer(1);
    // Pan law (sqrt)
    float gainL = std::sqrt(1.0f - micPan);
    float gainR = std::sqrt(micPan);
    for (int i = 0; i < buffer.getNumSamples(); ++i) {
      chL[i] *= gainL;
      chR[i] *= gainR;
    }
  }

  // 2.5 Mix
  // Blend Dry (from dryBuffer) and Wet (buffer)
  // Support Mono->Stereo: Use Channel 0 of dryBuffer for Channel 1 if dryBuffer
  // is mono

  bool inputIsMono = (totalNumInputChannels == 1);

  for (int c = 0; c < totalNumOutputChannels; ++c) {
    // Determine source for Dry signal
    const float *dryData = nullptr;
    if (c < dryBuffer.getNumChannels()) {
      dryData = dryBuffer.getReadPointer(c);
    } else if (inputIsMono && dryBuffer.getNumChannels() > 0) {
      dryData = dryBuffer.getReadPointer(0); // Duplicate Mono to Right
    }

    auto *wetData = buffer.getWritePointer(c);

    // Visualizer Input (Max of wet signal for mesh deformation)
    if (c == 0) {
      float max = buffer.getMagnitude(0, buffer.getNumSamples());
      currentAmplitude = max;
    }

    // If we have dry data, mix. If not (e.g. invalid channel), just use wet?
    if (dryData) {
      for (int s = 0; s < buffer.getNumSamples(); ++s) {
        wetData[s] = (dryData[s] * (1.0f - mix)) + (wetData[s] * mix);
      }
    } else {
      // Just scale wet if no dry available (shouldn't happen with logic above)
      for (int s = 0; s < buffer.getNumSamples(); ++s) {
        wetData[s] = wetData[s] * mix;
      }
    }
  }
}

// ... boilerplate ...
void FunkhausAudioProcessor::getStateInformation(juce::MemoryBlock &destData) {
  auto state = apvts.copyState();
  std::unique_ptr<juce::XmlElement> xml(state.createXml());
  copyXmlToBinary(*xml, destData);
}

void FunkhausAudioProcessor::setStateInformation(const void *data,
                                                 int sizeInBytes) {
  std::unique_ptr<juce::XmlElement> xmlState(
      getXmlFromBinary(data, sizeInBytes));
  if (xmlState.get() != nullptr)
    if (xmlState->hasTagName(apvts.state.getType()))
      apvts.replaceState(juce::ValueTree::fromXml(*xmlState));
}

juce::AudioProcessorEditor *FunkhausAudioProcessor::createEditor() {
  return new FunkhausAudioProcessorEditor(*this);
}
bool FunkhausAudioProcessor::hasEditor() const { return true; }

juce::AudioProcessor *JUCE_CALLTYPE createPluginFilter() {
  return new FunkhausAudioProcessor();
}
