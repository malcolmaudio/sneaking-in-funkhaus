#pragma once
#include <JuceHeader.h>

class GlimmerEngine {
public:
  GlimmerEngine() {}

  void prepare(const juce::dsp::ProcessSpec &spec) {
    sampleRate = spec.sampleRate;

    // Filtering inside the loop to tame the high end buildup
    lowPassFilter.prepare(spec);
    lowPassFilter.setType(juce::dsp::StateVariableTPTFilterType::lowpass);
    lowPassFilter.setCutoffFrequency(6000.0f);

    // Since JUCE doesn't have a native real-time pitch shifter in dsp::,
    // we'll use a fast modulated delay (chorusing) as a faux-shimmer for the
    // MVP, or a granular buffer approach if full pitch shifting is strictly
    // needed. For a true ethereal shimmer in modern algorithms, nested
    // modulated all-pass filters and chorusing often achieve the 'glimmer'
    // without stark artifacts. Let's stack them:

    for (auto &chorus : choruses) {
      chorus.prepare(spec);
    }

    // Chorus 1: Fast & shallow
    choruses[0].setRate(1.2f);
    choruses[0].setDepth(0.15f);
    choruses[0].setCentreDelay(10.0f);
    choruses[0].setFeedback(0.2f);
    choruses[0].setMix(0.8f);

    // Chorus 2: Slow & deep
    choruses[1].setRate(0.3f);
    choruses[1].setDepth(0.3f);
    choruses[1].setCentreDelay(25.0f);
    choruses[1].setFeedback(0.3f);
    choruses[1].setMix(0.8f);
  }

  void setAmount(float amount) {
    // Defines the intensity of the ethereal effect
    shimmerMix = juce::jlimit(0.0f, 1.0f, amount);

    // Increase chorus depth based on amount
    choruses[1].setDepth(0.1f + shimmerMix * 0.4f);

    // Open up the filter as it gets more intense
    lowPassFilter.setCutoffFrequency(4000.0f + shimmerMix * 6000.0f);
  }

  void process(juce::dsp::ProcessContextReplacing<float> &context) {
    if (shimmerMix <= 0.01f)
      return;

    // Save the input to mix back later
    auto *inputBlock = context.getInputBlock().getChannelPointer(
        0); // Assuming mono/stereo handled in processor loop per channel
    int numSamples = (int)context.getInputBlock().getNumSamples();

    // Process through the choruses (Modulation)
    for (auto &chorus : choruses) {
      chorus.process(context);
    }

    // Process through Low Pass (Taming)
    lowPassFilter.process(context);

    // Fake Pitch Shift / Saturation (Drive it into soft clipping to generate
    // harmonics)
    auto *outputBlock = context.getOutputBlock().getChannelPointer(0);
    for (int i = 0; i < numSamples; ++i) {
      float s = outputBlock[i];

      // Generate harmonics by soft clipping the modulated tail
      float driven = s * (1.0f + shimmerMix * 3.0f);
      float saturated = std::tanh(driven);

      // Blend back with the processed signal
      outputBlock[i] =
          (s * (1.0f - shimmerMix)) + (saturated * shimmerMix * 0.5f);
    }
  }

private:
  double sampleRate = 44100.0;
  float shimmerMix = 0.0f;

  juce::dsp::StateVariableTPTFilter<float> lowPassFilter;
  std::array<juce::dsp::Chorus<float>, 2> choruses;
};
