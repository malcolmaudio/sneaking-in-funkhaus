#pragma once

#include "GlimmerEngine.h"
#include "MicModeller.h"
#include <JuceHeader.h>

class FunkhausAudioProcessor : public juce::AudioProcessor {
public:
  FunkhausAudioProcessor();
  ~FunkhausAudioProcessor() override;

  void prepareToPlay(double sampleRate, int samplesPerBlock) override;
  void releaseResources() override;
  bool isBusesLayoutSupported(const BusesLayout &layouts) const override;
  void processBlock(juce::AudioBuffer<float> &, juce::MidiBuffer &) override;

  juce::AudioProcessorEditor *createEditor() override;
  bool hasEditor() const override;

  const juce::String getName() const override;
  bool acceptsMidi() const override;
  bool producesMidi() const override;
  bool isMidiEffect() const override;
  double getTailLengthSeconds() const override;

  int getNumPrograms() override;
  int getCurrentProgram() override;
  void setCurrentProgram(int index) override;
  const juce::String getProgramName(int index) override;
  void changeProgramName(int index, const juce::String &newName) override;

  void getStateInformation(juce::MemoryBlock &destData) override;
  void setStateInformation(const void *data, int sizeInBytes) override;

  // APVTS
  juce::AudioProcessorValueTreeState apvts;

  // Visualization State
  std::atomic<float> currentAmplitude{0.0f};

  // Internal DSP
  juce::dsp::Reverb reverb;
  juce::dsp::Reverb::Parameters reverbParams;

  // New DSP Engines
  std::array<MicModeller, 2> micModellers;
  std::array<GlimmerEngine, 2> glimmerEngines;

  juce::dsp::LadderFilter<float> diffFilter; // For "Grit"

  // Delay Line for Pre-Delay
  juce::dsp::DelayLine<float, juce::dsp::DelayLineInterpolationTypes::Linear>
      preDelayLine{192000};

  // Tone Shaping
  std::array<juce::dsp::StateVariableTPTFilter<float>, 2> highPassFilters;

private:
  juce::AudioProcessorValueTreeState::ParameterLayout createParameterLayout();
  juce::Random random;

  JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(FunkhausAudioProcessor)
};
