#!/bin/bash

DIR="$(dirname "${BASH_SOURCE[0]}")"
DIR="$(realpath "${DIR}")"
cd "$DIR"

version="${1:-stable}"
build="${2:-6.0.4}"

distro="debian"
distro_version="buster"
export ARCH="x86_64" # https://github.com/AppImage/AppImageKit/releases/

buildFolder="build"
distFolder="dist"
wrapperFileName="winewrapper"

if [ "$version" = "stable" ]; then
    declare -A info=( ["base"]="official"  ["package"]="winehq-stable"   ["readableName"]="Stable" )
fi
if [ "$version" = "devel" ]; then
    declare -A info=( ["base"]="official"  ["package"]="winehq-devel"    ["readableName"]="" )
fi
if [ "$version" = "staging" ]; then
    declare -A info=( ["base"]="official"  ["package"]="winehq-staging"  ["readableName"]="Staging" )
fi

baseFilePath="base_wine_${info["base"]}.yml"
wineVersion="${info["package"]}=${build}~${distro_version}"
appimageVersion="AI1Wine${info["readableName"]}64Bit${build}"

# TODO: Crossover support is still in development
# TODO: Proton still needs to be supported too

requiredPkg2appimageFileName="pkg2appimage.AppDir/AppRun"
fullPkg2appimagePath="$DIR/$requiredPkg2appimageFileName"
if [ ! -f "$fullPkg2appimagePath" ]; then
    echo "${fullPkg2appimagePath} is required to run this script"
    exit 1
fi

# Adding package URL
dataYaml=$(cat $baseFilePath)

# Adding base file variables
dataYaml="${dataYaml//__version__/"$version"}"
dataYaml="${dataYaml//__distro__/"$distro"}"
dataYaml="${dataYaml//__distro_version__/"$distro_version"}"
dataYaml="${dataYaml//__appimage_version__/"$appimageVersion"}"

dataYaml="${dataYaml//__wine_version__/"$wineVersion"}"


# Recreating build folder
fullBuildFolderPath="$DIR/$buildFolder"
if [ -d "$fullBuildFolderPath" ]; then
    rm -r "$fullBuildFolderPath"
fi
mkdir "$fullBuildFolderPath"

# Recreating dist folder
fullDistFolderPath="$DIR/$distFolder"
if [ ! -d "$fullDistFolderPath" ]; then
    mkdir "$fullDistFolderPath"
fi

# Writting recipe file
filePath="wine-${version}-${build}~${distro_version}.yml"
echo "$dataYaml" > "$fullBuildFolderPath/$filePath"

tries=3
while [ $tries -ge 0 ]
do
    tries=$(( $tries - 1 ))

    # Running recipe file
    cd "$fullBuildFolderPath"
    "$DIR/$requiredPkg2appimageFileName" "./$filePath" | tee "$fullBuildFolderPath/BUILD_LOGS"

    finalPath="$fullDistFolderPath/${appimageVersion}.AppImage"
    if [ -f "$finalPath" ]; then
        rm "$finalPath"
    fi
    
    cd "$DIR"
    mv ./${buildFolder}/out/Wine*.AppImage "${finalPath}" || continue
    
    exit 0
done