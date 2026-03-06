cmake_minimum_required(VERSION 3.22)

project(FunkhausModern VERSION 0.0.1 LANGUAGES C CXX)

# Point to local JUCE
add_subdirectory(../../Libs/JUCE JUCE)

juce_add_plugin(FunkhausModern
    COMPANY_NAME "malcolm audio"
    IS_SYNTH FALSE
    NEEDS_MIDI_INPUT FALSE
    NEEDS_MIDI_OUTPUT FALSE
    IS_MIDI_EFFECT FALSE
    EDITOR_WANTS_KEYBOARD_FOCUS TRUE
    COPY_PLUGIN_AFTER_BUILD TRUE
    PLUGIN_MANUFACTURER_CODE "ErRi"
    PLUGIN_CODE "Sf3d"
    FORMATS AU VST3
    PRODUCT_NAME "Sneaking in Funkhaus 3D"
    BUNDLE_ID "com.malcolmaudio.sneakinginfunkhaus3d"
    VST3_CATEGORIES "Reverb" "Spatial"
    VST2_CATEGORY "kPlugCategReverb"
)

juce_generate_juce_header(FunkhausModern)

target_sources(FunkhausModern
    PRIVATE
        Source/PluginProcessor.cpp
        Source/PluginProcessor.h
        Source/PluginEditor.cpp
        Source/PluginEditor.h
)

target_compile_features(FunkhausModern PRIVATE cxx_std_20)

# Assets (Fonts + Embedded UI as BinaryData fallback)
juce_add_binary_data(FunkhausModernAssets
    SOURCES
        ../HarmonicsEnhancer/Source/Resources/AlbertSans-Regular.ttf
        Source/ui.html
)

target_link_libraries(FunkhausModern
    PRIVATE
        juce::juce_audio_utils
        juce::juce_audio_processors
        juce::juce_dsp
        juce::juce_gui_basics
        juce::juce_gui_extra  # Required for WebView
        juce::juce_graphics
        FunkhausModernAssets
)

target_compile_definitions(FunkhausModern
    PUBLIC
        JUCE_VST3_CAN_REPLACE_VST2=0
        JUCE_WEB_BROWSER=1
        JUCE_USE_CURL=0
)

# Copy ui.html to BOTH AU and VST3 plugin bundle Resources.
# We copy to both the build artefact AND the installed location because
# JUCE's COPY_PLUGIN_AFTER_BUILD runs before our POST_BUILD commands.

# --- VST3 ---
add_custom_command(TARGET FunkhausModern_VST3 POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E make_directory
        "$<TARGET_BUNDLE_DIR:FunkhausModern_VST3>/Contents/Resources"
    COMMAND ${CMAKE_COMMAND} -E copy
        "${CMAKE_CURRENT_SOURCE_DIR}/Source/ui.html"
        "$<TARGET_BUNDLE_DIR:FunkhausModern_VST3>/Contents/Resources/ui.html"
    # Also copy to the installed location
    COMMAND ${CMAKE_COMMAND} -E make_directory
        "$ENV{HOME}/Library/Audio/Plug-Ins/VST3/Sneaking in Funkhaus 3D.vst3/Contents/Resources"
    COMMAND ${CMAKE_COMMAND} -E copy
        "${CMAKE_CURRENT_SOURCE_DIR}/Source/ui.html"
        "$ENV{HOME}/Library/Audio/Plug-Ins/VST3/Sneaking in Funkhaus 3D.vst3/Contents/Resources/ui.html"
    COMMENT "Copying ui.html to VST3 bundle + installed location"
)

# --- AU ---
add_custom_command(TARGET FunkhausModern_AU POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E make_directory
        "$<TARGET_BUNDLE_DIR:FunkhausModern_AU>/Contents/Resources"
    COMMAND ${CMAKE_COMMAND} -E copy
        "${CMAKE_CURRENT_SOURCE_DIR}/Source/ui.html"
        "$<TARGET_BUNDLE_DIR:FunkhausModern_AU>/Contents/Resources/ui.html"
    # Also copy to the installed location
    COMMAND ${CMAKE_COMMAND} -E make_directory
        "$ENV{HOME}/Library/Audio/Plug-Ins/Components/Sneaking in Funkhaus 3D.component/Contents/Resources"
    COMMAND ${CMAKE_COMMAND} -E copy
        "${CMAKE_CURRENT_SOURCE_DIR}/Source/ui.html"
        "$ENV{HOME}/Library/Audio/Plug-Ins/Components/Sneaking in Funkhaus 3D.component/Contents/Resources/ui.html"
    COMMENT "Copying ui.html to AU bundle + installed location"
)
