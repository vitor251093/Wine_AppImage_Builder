const fs = require('fs')
const child_process = require('child_process')
const path = require('path')
const yaml = require('yaml')

const args = process.argv.slice(2)
const version = args[0] || "stable"
const build = args[1] || "6.0.4"
const distro = "debian"
const distro_version = "buster"

const architecture = "x86_64" // https://github.com/AppImage/AppImageKit/releases/
const buildFolder = "build"
const distFolder = "dist"
const baseFilePath = "wine_base.yml"
const wrapperFileName = "winewrapper"

const packagesByVersion = {
    "stable":  ["winehq-stable"],
    "devel":   ["winehq-devel"],
    "staging": ["winehq-staging"]
}

const requiredPkg2appimageFileName = path.join("pkg2appimage.AppDir", "AppRun")
const fullPkg2appimagePath = path.join(__dirname, requiredPkg2appimageFileName)
if (!fs.existsSync(fullPkg2appimagePath)) {
    throw new Error(`${requiredPkg2appimageFileName} is required to run this script`)
}

// Adding package URL
let dataYaml = fs.readFileSync(baseFilePath, {encoding: 'utf-8'})
const data = yaml.parse(dataYaml, {strict:false})
let include = data["ingredients"]["packages"]
let packages = packagesByVersion[version]
while (packages.length > 0) {
    include.unshift(`${packages.pop()}=${build}~${distro_version}`)
}
dataYaml = yaml.stringify(data, {lineWidth:1000})

// Adding wrapper script
const wrapperContentsPreSpaces = "  "
const wrapperContents = fs.readFileSync(path.join(".", wrapperFileName), {encoding:"utf-8"})
const wrapperContentsLines = wrapperContents.split("\n").map(l => wrapperContentsPreSpaces + "- " + l).join("\n")
dataYaml = dataYaml.replace(wrapperContentsPreSpaces + "- WRAPPER_FILE", wrapperContentsLines)

// Adding Wine version, distro distro version
dataYaml = dataYaml.split("__version__").join(version)
dataYaml = dataYaml.split("__distro__").join(distro)
dataYaml = dataYaml.split("__distro_version__").join(distro_version)

// Recreating build folder
const fullBuildFolderPath = path.join(__dirname, buildFolder)
if (fs.existsSync(fullBuildFolderPath)) {
    fs.rmSync(fullBuildFolderPath, {recursive:true})
}
fs.mkdirSync(fullBuildFolderPath)

// Recreating dist folder
const fullDistFolderPath = path.join(__dirname, distFolder)
if (!fs.existsSync(fullDistFolderPath)) {
    fs.mkdirSync(fullDistFolderPath)
}

// Writting recipe file
const filePath = `wine-${version}-${build}~${distro_version}.yml`
fs.writeFileSync(path.join(buildFolder, filePath), dataYaml, 'utf-8');

while (1) {
    // Running recipe file
    let output = child_process.spawnSync(path.join(__dirname, requiredPkg2appimageFileName),
            [path.join(".", filePath)], {cwd:fullBuildFolderPath, encoding:"utf-8", env:{"ARCH":architecture}})

    const log = (output.output || []).map(o => Buffer.isBuffer(o) ? Buffer.toString(o) : ("" + o)).join("\n")
    fs.writeFileSync(path.join(buildFolder, "BUILD_LOGS"), log, 'utf-8');

    const finalPath = path.join(fullDistFolderPath, `Wine-${version}-${build}~${distro_version}.AppImage`)
    if (fs.existsSync(finalPath)) {
        fs.rmSync(finalPath)
    }
    try {
        child_process.execSync(`mv ./build/out/Wine*.AppImage ${finalPath}`)
    }
    catch(e){
        continue
    }
    break
}