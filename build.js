const fs = require('fs')
const yaml = require('yaml')
const child_process = require('child_process')

const version = "stable"

const baseFilePath = "wine_base.yml"
const dataYaml = fs.readFileSync(baseFilePath, {encoding: 'utf-8'})
const data = yaml.parse(dataYaml)

data["AppDir"]["app_info"]["version"] = version
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
data["AppDir"]["runtime"]["path_mappings"] = [`/opt/wine-${version}:$APPDIR/opt/wine-${version}`]

let filePath = `wine-${version}.yml`
fs.writeFileSync(filePath, yaml.stringify(data), 'utf-8');

let output = child_process.spawnSync("./pkg2appimage.AppImage", [`./${filePath}`], {cwd:__dirname, encoding:"utf-8"})
console.log(output.output.join("\n"))