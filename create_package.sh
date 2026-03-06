#!/bin/bash

# Configuration
PKG_NAME="sneaking in Funkhaus v2.pkg"
IDENTIFIER="com.erricotta.sneakinginfunkhausv2"
VERSION="0.0.1" # Using version from CMakeLists.txt
STAGING_DIR="package_staging"

# Cleanup previous attempts
rm -rf "$STAGING_DIR"
rm -f "$PKG_NAME"

# Create directory structure
mkdir -p "$STAGING_DIR/Library/Audio/Plug-Ins/VST3"
mkdir -p "$STAGING_DIR/Library/Audio/Plug-Ins/Components"

# Copy artifacts
echo "Copying plugins..."
cp -R "build/FunkhausModern_artefacts/Release/VST3/sneaking in Funkhaus v2.vst3" "$STAGING_DIR/Library/Audio/Plug-Ins/VST3/"
cp -R "build/FunkhausModern_artefacts/Release/AU/sneaking in Funkhaus v2.component" "$STAGING_DIR/Library/Audio/Plug-Ins/Components/"

# Build the package
echo "Building package..."
pkgbuild --root "$STAGING_DIR" \
         --identifier "$IDENTIFIER" \
         --version "$VERSION" \
         --install-location "/" \
         "$PKG_NAME"

# Cleanup staging
rm -rf "$STAGING_DIR"

echo "Package created at: $(pwd)/$PKG_NAME"
