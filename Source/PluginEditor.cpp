#include "PluginEditor.h"
#include "BinaryData.h"
#include "PluginProcessor.h"

//==============================================================================
FunkhausAudioProcessorEditor::FunkhausAudioProcessorEditor(
    FunkhausAudioProcessor &p)
    : AudioProcessorEditor(&p), audioProcessor(p) {

  // 1. Create a minimal Diagnostic UI
  // USING CUSTOM DELIMITER "HTML" TO AVOID CONFLICT WITH JS CODE
  // 1. Prepare UI File
  // Write the embedded production interface (ui.html) to a temporary file
  // so it can be loaded with file:// scheme, avoiding CORS/scheme issues.
  auto tempDir = juce::File::getSpecialLocation(juce::File::tempDirectory)
                     .getChildFile("FunkhausModern_UI");
  tempDir.createDirectory();
  auto uiFile = tempDir.getChildFile("ui.html");
  uiFile.replaceWithData(BinaryData::ui_html, BinaryData::ui_htmlSize);

  // 2. Configure WebView with Native Bridge Polyfill
  // We manually inject the JUCE frontend helpers because they aren't loaded
  // automatically
  juce::String jsPolyfill = R"JS(
    class PromiseHandler {
      constructor() {
        this.lastPromiseId = 0;
        this.promises = new Map();
        window.__JUCE__.backend.addEventListener("__juce__complete", (event) => {
          if (this.promises.has(event.promiseId)) {
            this.promises.get(event.promiseId).resolve(event.result);
            this.promises.delete(event.promiseId);
          }
        });
      }
      createPromise() {
        const promiseId = this.lastPromiseId++;
        return [promiseId, new Promise((resolve, reject) => {
          this.promises.set(promiseId, { resolve, reject });
        })];
      }
    }

    const promiseHandler = new PromiseHandler();

    function getNativeFunction(name) {
      if (window.__JUCE__.initialisationData.__juce__functions && 
          !window.__JUCE__.initialisationData.__juce__functions.includes(name)) {
        console.warn("Creating unknown native function: " + name);
      }
      return function() {
        const [promiseId, result] = promiseHandler.createPromise();
        window.__JUCE__.backend.emitEvent("__juce__invoke", {
          name: name,
          params: Array.prototype.slice.call(arguments),
          resultId: promiseId,
        });
        return result;
      };
    }
    
    // EXPOSE GLOBALLY
    window.getNativeFunction = getNativeFunction;
    window.setParameter = getNativeFunction("setParameter");
    console.log("JUCE Bridge Polyfill Injected. window.setParameter ready.");

    // --- DEBUG: GLOBAL ERROR HANDLER ---
    window.onerror = function(msg, url, line, col, error) {
      document.body.style.backgroundColor = "#220000"; // Red tint on error
      var errDiv = document.createElement("div");
      errDiv.style.position = "fixed";
      errDiv.style.top = "0";
      errDiv.style.left = "0";
      errDiv.style.width = "100%";
      errDiv.style.padding = "20px";
      errDiv.style.background = "rgba(255,0,0,0.9)";
      errDiv.style.color = "white";
      errDiv.style.zIndex = "999999";
      errDiv.style.fontFamily = "monospace";
      errDiv.style.whiteSpace = "pre-wrap";
      errDiv.innerHTML = "<h3>JS Error</h3>" + 
        "<b>Msg:</b> " + msg + "<br>" +
        "<b>Line:</b> " + line + ":" + col + "<br>" +
        "<b>Stack:</b> " + (error ? error.stack : "N/A");
      document.body.appendChild(errDiv);
      return false; 
    };
    console.log("Global Error Handler Installed");
  )JS";

  auto options =
      juce::WebBrowserComponent::Options{}
          .withKeepPageLoadedWhenBrowserIsHidden()
          .withAppleWkWebViewOptions(
              juce::WebBrowserComponent::Options::AppleWkWebView{}
                  .withAllowAccessToEnclosingDirectory(true))
          .withUserScript(jsPolyfill)
          .withNativeFunction(
              juce::Identifier("setParameter"),
              [this](const juce::Array<juce::var> &args,
                     juce::WebBrowserComponent::NativeFunctionCompletion
                         completion) {
                if (args.size() == 2 && args[0].isString()) {
                  // Case 1: setParameter("paramId", value)
                  setParameterFromJS(args[0].toString(), (float)args[1]);
                }
                completion(juce::var());
              });

  webView = std::make_unique<juce::WebBrowserComponent>(options);
  addAndMakeVisible(*webView);

  // 3. Load the diagnostic file
  juce::URL url(uiFile);
  webView->goToURL(url.toString(false));

  // Set window size for the new layout (Wider aspect ratio)
  setSize(1350, 750);
  setResizable(true, true); // Allow resizing just in case
  startTimerHz(30);
}

FunkhausAudioProcessorEditor::~FunkhausAudioProcessorEditor() { stopTimer(); }

void FunkhausAudioProcessorEditor::paint(juce::Graphics &g) {
  g.fillAll(juce::Colours::black);
}

void FunkhausAudioProcessorEditor::resized() {
  if (webView)
    webView->setBounds(getLocalBounds());
}

void FunkhausAudioProcessorEditor::timerCallback() { syncParametersToJS(); }

void FunkhausAudioProcessorEditor::setParameterFromJS(
    const juce::String &paramId, float value) {
  auto *param = audioProcessor.apvts.getParameter(paramId);
  if (param) {
    if (!isDragging)
      param->beginChangeGesture();

    if (auto *p = dynamic_cast<juce::RangedAudioParameter *>(param)) {
      float normalized = p->getNormalisableRange().convertTo0to1(value);
      p->setValueNotifyingHost(normalized);
    } else {
      param->setValueNotifyingHost(value);
    }

    if (!isDragging)
      param->endChangeGesture();
  }
}

void FunkhausAudioProcessorEditor::setDragging(bool dragging,
                                               const juce::String &paramId) {
  if (isDragging != dragging) {
    isDragging = dragging;
    lastDraggedParamId = paramId;
  }
}

void FunkhausAudioProcessorEditor::syncParametersToJS() {
  // simplified for brevity
}
