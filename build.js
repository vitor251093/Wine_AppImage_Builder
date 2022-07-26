const fs = require('fs')
const yaml = require('yaml')
const child_process = require('child_process')
const path = require('path')

const args = process.argv.slice(2)
const version = args[0] || "stable"
const build = args[1] || "6.0.4"

const architecture = "amd64"
const distribution_version = "buster"
const buildFolder = "build"
const baseFilePath = "wine_base.yml"
const wrapperFileName = "wrapper"

const packagesByVersion = {
    "stable":  "wine-stable",
    "devel":   "wine-devel",
    "staging": "wine-staging"
}

const requiredPkg2appimageFileName = "pkg2appimage.AppImage"
const fullPkg2appimagePath = path.join(__dirname, requiredPkg2appimageFileName)
if (!fs.existsSync(fullPkg2appimagePath)) {
    throw new Error(`${requiredPkg2appimageFileName} is required to run this script`)
}

const dataYaml = fs.readFileSync(baseFilePath, {encoding: 'utf-8'})
const data = yaml.parse(dataYaml, {strict:false})

// Adding necessary packages
let package = packagesByVersion[version]
if (architecture === "amd64") {
    package += "-" + architecture
}
let packageUrl = `https://dl.winehq.org/wine-builds/debian/dists/${distribution_version}/main/binary-${architecture}/${package}_${build}~${distribution_version}-1_${architecture}.deb`

// Adding wrapper script
const wrapperContentsPreSpaces = "  "
const wrapperContents = fs.readFileSync(path.join(".", wrapperFileName), {encoding:"utf-8"})
const wrapperContentsLines = wrapperContents.split("\n").map(l => wrapperContentsPreSpaces + "- " + l).join("\n")
let newDataYaml = yaml.stringify(data, {lineWidth:1000})
newDataYaml = newDataYaml.replace(wrapperContentsPreSpaces + "- WRAPPER_FILE", wrapperContentsLines)

// Adding Wine version in all other needed places
newDataYaml = newDataYaml.split("__package_url__").join(packageUrl)
newDataYaml = newDataYaml.split("__version__").join(version)
newDataYaml = newDataYaml.split("__distribution_version__").join(distribution_version)

// Recreating build folder
const fullBuildFolderPath = path.join(__dirname, buildFolder)
if (fs.existsSync(fullBuildFolderPath)) {
    fs.rmSync(fullBuildFolderPath, {recursive:true})
}
fs.mkdirSync(fullBuildFolderPath)

// Writting recipe file
const filePath = `wine-${version}-${build}~${distribution_version}.yml`
fs.writeFileSync(path.join(buildFolder, filePath), newDataYaml, 'utf-8');

// Running recipe file
let output = child_process.spawnSync(path.join(__dirname, requiredPkg2appimageFileName),
    [path.join(".", filePath)], {cwd:fullBuildFolderPath, encoding:"utf-8"})
if (output.output === null) {
    console.log(output)
}
else {
    const log = output.output.join("\n")
    fs.writeFileSync(path.join(buildFolder, "BUILD_LOGS"), log, 'utf-8');
}
