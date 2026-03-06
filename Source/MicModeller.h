#pragma once
#include <JuceHeader.h>

class MicModeller {
public:
  MicModeller() {}

  void prepare(const juce::dsp::ProcessSpec &spec) {
    sampleRate = spec.sampleRate;
    for (auto &filter : filters) {
      filter.prepare(spec);
    }
    // Initialize default state
    setModel(0, true);
  }

  void setModel(int modelIndex, bool force = false) {
    if (!force && currentModel == modelIndex)
      return;
    currentModel = modelIndex;

    // Create EQ profiles for different microphones
    // 0=Condenser (U87ish), 1=Dynamic (SM57ish), 2=Ribbon (R121ish), 3=LoFi
    switch (modelIndex) {
    case 0: // Condenser - Wide, slight presence bump (8kHz)
      filters[0].coefficients =
          *juce::dsp::IIR::Coefficients<float>::makeHighPass(sampleRate, 40.0f,
                                                             0.7f);
      filters[1].coefficients =
          *juce::dsp::IIR::Coefficients<float>::makePeakFilter(
              sampleRate, 8000.0f, 0.7f, 1.2f); // +1.5dB boost
      filters[2].coefficients =
          *juce::dsp::IIR::Coefficients<float>::makeLowPass(sampleRate,
                                                            18000.0f, 0.7f);
      break;
    case 1: // Dynamic - Tight lows, mid push (3kHz), early roll-off
      filters[0].coefficients =
          *juce::dsp::IIR::Coefficients<float>::makeHighPass(sampleRate, 120.0f,
                                                             1.0f);
      filters[1].coefficients =
          *juce::dsp::IIR::Coefficients<float>::makePeakFilter(
              sampleRate, 3000.0f, 1.2f, 1.58f); // +4dB boost
      filters[2].coefficients =
          *juce::dsp::IIR::Coefficients<float>::makeLowPass(sampleRate,
                                                            12000.0f, 0.8f);
      break;
    case 2: // Ribbon - Warm, thick low-mids, smooth high roll-off
      filters[0].coefficients =
          *juce::dsp::IIR::Coefficients<float>::makeHighPass(sampleRate, 30.0f,
                                                             0.5f);
      filters[1].coefficients =
          *juce::dsp::IIR::Coefficients<float>::makePeakFilter(
              sampleRate, 300.0f, 0.5f, 1.4f); // +3dB warmth
      filters[2].coefficients =
          *juce::dsp::IIR::Coefficients<float>::makeLowPass(sampleRate, 8000.0f,
                                                            0.6f);
      break;
    case 3: // LoFi - Telephone style, narrow bandpass
      filters[0].coefficients =
          *juce::dsp::IIR::Coefficients<float>::makeHighPass(sampleRate, 400.0f,
                                                             1.5f);
      filters[1].coefficients =
          *juce::dsp::IIR::Coefficients<float>::makePeakFilter(
              sampleRate, 1500.0f, 2.0f, 1.58f);
      filters[2].coefficients =
          *juce::dsp::IIR::Coefficients<float>::makeLowPass(sampleRate, 4000.0f,
                                                            1.5f);
      break;
    default:
      break;
    }
  }

  void process(juce::dsp::ProcessContextReplacing<float> &context) {
    for (auto &filter : filters) {
      filter.process(context);
    }
  }

private:
  double sampleRate = 44100.0;
  int currentModel = -1;
  // Cascade of 3 IIR filters (HPF, Peak/Bell, LPF) to shape the mic response
  std::array<juce::dsp::IIR::Filter<float>, 3> filters;
};
