#pragma once

#include "PluginProcessor.h"
#include <JuceHeader.h>

//==============================================================================
class FunkhausAudioProcessorEditor : public juce::AudioProcessorEditor,
                                     public juce::Timer {
public:
  FunkhausAudioProcessorEditor(FunkhausAudioProcessor &);
  ~FunkhausAudioProcessorEditor() override;

  void paint(juce::Graphics &) override;
  void resized() override;
  void timerCallback() override;

private:
  FunkhausAudioProcessor &audioProcessor;

  // Web UI
  std::unique_ptr<juce::WebBrowserComponent> webView;

  // Helper to send parameter updates to JS
  void syncParametersToJS();

  // Handle updates from JS
  void setParameterFromJS(const juce::String &paramId, float value);
  void setDragging(bool dragging, const juce::String &paramId = {});

  // Track if user is interacting with UI to avoid fighting updates
  juce::String lastDraggedParamId;
  juce::int64 lastInteractionTime = 0; // ms
  bool isDragging = false;
  float lastUiUpdate = 0.0f;

  JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(FunkhausAudioProcessorEditor)
};
