#!/bin/bash

DIR="$(dirname "${BASH_SOURCE[0]}")"
DIR="$(realpath "${DIR}")"
cd "$DIR"

if [$# -le 2]; then 
    echo "illegal number of parameters"
    exit 1
fi

version="${1}"
build="${2}"
winebuild="${build}"

distro="debian"
distro_version="buster"
export ARCH="x86_64"

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
if [ "$version" = "crossover" ]; then
    declare -A info=( ["base"]="custom"    ["package"]="winehq-${3}"     ["readableName"]="CX" )
    winebuild="${4:-stable}"
fi
if [ "$version" = "proton" ]; then
    declare -A info=( ["base"]="proton"    ["package"]="winehq-${3}"     ["readableName"]="Proton" )
    winebuild="${4:-7.14}"
fi

bitsLabel=""
if [[ $REPO_ARCH != "i386" ]] ; then
    bitsLabel="64Bit"
fi

baseFilePath="base_wine_${info["base"]}.yml"
wineVersion="${info["package"]}=${winebuild}~${distro_version}"
appimageVersion="AI1Wine${info["readableName"]}${bitsLabel}${build}"

# TODO: Crossover support is still in development
# TODO: Proton still needs to be supported too

requiredPkg2appimageFileName="pkg2appimage.AppDir/AppRun"
fullPkg2appimagePath="$DIR/$requiredPkg2appimageFileName"
if [ ! -f "$fullPkg2appimagePath" ]; then
    echo "${fullPkg2appimagePath} is required to run this script"
    exit 1
fi

# Loading base file
dataYaml=$(cat $baseFilePath)

if [ "$version" = "crossover" ]; then
    sourceUrl="https://media.codeweavers.com/pub/crossover/source/crossover-sources-${build}.tar.gz"
    wget $sourceUrl -O crossover.tar.gz
    tar -xf crossover.tar.gz -C .
    cd sources/wine
    ./configure CC="clang" CXX="clang++" --enable-win64 --disable-winedbg --without-x --without-vulkan --disable-mscms # requires clang flex bison libfreetype6-dev
    exit 0
fi
if [ "$version" = "proton" ]; then
    urlBuild="${build//./-}"
    dataYaml="${dataYaml//__proton_build__/"$urlBuild"}"
fi

# Adding base file variables
dataYaml="${dataYaml//__build__/"$build"}"
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