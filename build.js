const fs = require('fs')
const yaml = require('yaml')
const child_process = require('child_process')
const path = require('path')

const args = process.argv.slice(2)
const version = args[0] || "stable"

const buildFolder = "build"
const baseFilePath = "wine_base.yml"
const wrapperFileName = "wrapper"

const requiredPkg2appimageFileName = "pkg2appimage.AppImage"
const fullPkg2appimagePath = path.join(__dirname, requiredPkg2appimageFileName)
if (!fs.existsSync(fullPkg2appimagePath)) {
    throw new Error(`${requiredPkg2appimageFileName} is required to run this script`)
}

const dataYaml = fs.readFileSync(baseFilePath, {encoding: 'utf-8'})
const data = yaml.parse(dataYaml, {strict:false})

// Setting Wine version
data["AppDir"]["app_info"]["version"] = version

// Add necessary packages
let include = data["AppDir"]["apt"]["include"]
if (version === "stable") {
    include.unshift("winehq-stable")
}
if (version === "devel") {
    include.unshift("wine-devel")
    include.unshift("winehq-devel")
}
if (version === "staging") {
    include.unshift("wine-staging")
    include.unshift("winehq-staging")
}

// Add wrapper script
const wrapperContents = fs.readFileSync(path.join(".", wrapperFileName), {encoding:"utf-8"})
const wrapperContentsLines = wrapperContents.split("\n").map(l => "  - " + l).join("\n")
let newDataYaml = yaml.stringify(data, {lineWidth:1000})
newDataYaml = newDataYaml.replace("  - WRAPPER_FILE", wrapperContentsLines)

// Add Wine version in all other needed places
newDataYaml = newDataYaml.split("{{version}}").join(version)

const fullBuildFolderPath = path.join(__dirname, buildFolder)
if (fs.existsSync(fullBuildFolderPath)) {
    fs.rmSync(fullBuildFolderPath, {recursive:true})
}
fs.mkdirSync(fullBuildFolderPath)

const filePath = `wine-${version}.yml`
fs.writeFileSync(path.join(buildFolder, filePath), newDataYaml, 'utf-8');

let output = child_process.spawnSync(path.join(__dirname, "pkg2appimage.AppImage"), 
    [path.join(".", filePath)], {cwd:fullBuildFolderPath, encoding:"utf-8"})
if (output.output === null) {
    console.log(output)
}
else {
    const log = output.output.join("\n")
    fs.writeFileSync(path.join(buildFolder, "BUILD_LOGS"), log, 'utf-8');
}
