const fs = require('fs')
const child_process = require('child_process')
const path = require('path')

const args = process.argv.slice(2)
const version = args[0] || "stable"
const build = args[1] || "6.0.4"
const architecture = "amd64"
const distro = "debian"
const distro_version = "buster"

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

let dataYaml = fs.readFileSync(baseFilePath, {encoding: 'utf-8'})

// Adding package URL
let package = packagesByVersion[version]
if (architecture === "amd64") {
    package += "-" + architecture
}
let packageUrl = `https://dl.winehq.org/wine-builds/${distro}/dists/${distro_version}/main/binary-${architecture}/${package}_${build}~${distro_version}-1_${architecture}.deb`
dataYaml = dataYaml.split("__package_url__").join(packageUrl)

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
}
