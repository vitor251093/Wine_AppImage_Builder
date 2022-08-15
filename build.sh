#!/bin/bash

DIR="$(dirname "${BASH_SOURCE[0]}")"
DIR="$(realpath "${DIR}")"
cd "$DIR"

if [ "$#" -le 1 ]; then
    echo "illegal number of parameters"
    exit 1
fi

version="${1}"
build="${2}"
winebuild="${build}"
if [[ -z $REPO_ARCH || $REPO_ARCH != "i386" ]] ; then
    REPO_ARCH="amd64"
fi

distro="debian"
distro_version="buster"
export ARCH="x86_64"

buildFolder="build"
distFolder="dist"
wrapperFileName="winewrapper"

optFolderName="wine-custom"
if [ "$version" = "stable" ]; then
    declare -A info=( ["base"]="official"  ["package"]="winehq-stable"   ["readableName"]="Stable" )
    optFolderName="wine-stable"
elif [ "$version" = "devel" ]; then
    declare -A info=( ["base"]="official"  ["package"]="winehq-devel"    ["readableName"]="" )
    optFolderName="wine-devel"
elif [ "$version" = "staging" ]; then
    declare -A info=( ["base"]="official"  ["package"]="winehq-staging"  ["readableName"]="Staging" )
    optFolderName="wine-staging"
elif [ "$version" = "crossover" ]; then
    declare -A info=( ["base"]="custom"    ["package"]="winehq-${3:-stable}"     ["readableName"]="CX" )
    winebuild="${4:-7.14}"
    optFolderName="wine-${3:-stable}"
elif [ "$version" = "proton" ]; then
    declare -A info=( ["base"]="proton"    ["package"]="winehq-${3:-stable}"     ["readableName"]="Proton" )
    winebuild="${4:-7.14}"
    optFolderName="wine-${3:-stable}"
else
    declare -A info=( ["base"]="custom"    ["package"]="winehq-${3:-stable}"     ["readableName"]="Custom" )
    winebuild="${4:-7.14}"
fi

bitsLabel=""
if [[ $REPO_ARCH == "amd64" ]] ; then
    bitsLabel="64Bit"
fi

baseFilePath="base_wine_${info["base"]}.yml"
wineVersion="${info["package"]}:${REPO_ARCH}=${winebuild}~${distro_version}"
appimageVersion="AI1Wine${info["readableName"]}${bitsLabel}${build}"

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
    mkdir -p ./tmp
    cd tmp

    if [ ! -f "$DIR/tmp/wine-crossover-$build.tar.gz" ]; then
        rm -rf ./build || true
        if [ -d "$DIR/tmp/build" ]; then
            sudo rm -rf ./build || true
        fi

        if [ ! -f "$DIR/tmp/crossover-sources-${build}.tar.gz" ]; then
            sourceUrl="https://media.codeweavers.com/pub/crossover/source/crossover-sources-${build}.tar.gz"
            wget $sourceUrl -O "crossover-sources-${build}.tar.gz"
        fi
        tar -xf "crossover-sources-${build}.tar.gz" -C .

        mv sources/wine sources/wine-git
        mv sources build
        cp ../wine_crossover_distversion.h ./build/wine-git/programs/winedbg/distversion.h
        
        docker run --rm -v $DIR/tmp/build/:/build/ molotovsh/wine-builder-ubuntu build.sh $build
        mv "./build/wine-runner-$build.tgz" "./wine-crossover-$build.tar.gz"
    fi
    rm -r "../$optFolderName" || true
    mkdir -p "../$optFolderName"
    tar -xf "./wine-crossover-$build.tar.gz" -C "../$optFolderName"

    cd ..
fi
if [ "$version" = "proton" ]; then
    mkdir -p ./tmp
    cd tmp

    if [ ! -f "$DIR/tmp/wine-proton-$build.tar.gz" ]; then
        urlBuild="${build//./-}"
        sourceUrl="https://github.com/GloriousEggroll/wine-ge-custom/releases/download/GE-Proton${urlBuild}/wine-lutris-GE-Proton${urlBuild}-x86_64.tar.xz"
        wget $sourceUrl -O "./wine-proton-$build.tar.xz"
    fi
    rm -r "../$optFolderName" || true
    mkdir -p "../$optFolderName"
    tar -xf "./wine-proton-$build.tar.xz" -C "../$optFolderName"

    cd ..
fi

if [ ! -d "$DIR/$optFolderName" ]; then
    echo "$DIR/$optFolderName is required to run this script"
    exit 1
fi

# Adding base file variables
dataYaml="${dataYaml//__build__/"$build"}"
dataYaml="${dataYaml//__version__/"$version"}"
dataYaml="${dataYaml//__distro__/"$distro"}"
dataYaml="${dataYaml//__distro_version__/"$distro_version"}"
dataYaml="${dataYaml//__appimage_version__/"$appimageVersion"}"
dataYaml="${dataYaml//__wine_version__/"$wineVersion"}"
dataYaml="${dataYaml//__wine_build_folder_name__/"$optFolderName"}"

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