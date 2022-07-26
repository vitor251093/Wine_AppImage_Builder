const fs = require('fs')
const child_process = require('child_process')
const path = require('path')
const yaml = require('yaml')

const args = process.argv.slice(2)
const version = args[0] || "stable"
const build = args[1] || "6.0.4"
const distro = "debian"
const distro_version = "buster"

const buildFolder = "build"
const distFolder = "dist"
const baseFilePath = "wine_base.yml"
const wrapperFileName = "wrapper"

const packagesByVersion = {
    "stable":  ["winehq-stable"],
    "devel":   ["winehq-devel", "wine-devel"],
    "staging": ["winehq-staging", "wine-staging"]
}

const requiredPkg2appimageFileName = "pkg2appimage.AppImage"
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
dataYaml = dataYaml.split("__distribution__").join(distro)
dataYaml = dataYaml.split("__distribution_version__").join(distro_version)

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

// Running recipe file
let output = child_process.spawnSync(path.join(__dirname, requiredPkg2appimageFileName),
    [path.join(".", filePath)], {cwd:fullBuildFolderPath, encoding:"utf-8"})
if (output.output === null) {
    console.log(output)
}
else {
    const log = output.output.join("\n")
    fs.writeFileSync(path.join(buildFolder, "BUILD_LOGS"), log, 'utf-8');

    child_process.execSync(`mv ./build/out/Wine*.AppImage ${path.join(fullDistFolderPath, `Wine-${version}-${build}~${distro_version}.AppImage`)}`)
}
