# Wine_AppImage_Builder

Script that builds a Wine AppImage, so you can run Wine without installing it.

This project was based in the following projects:
- https://github.com/mmtrt/WINE_AppImage
- https://github.com/AppImage/pkg2appimage/pull/418/files

More details about pkg2appimage syntax here:
- https://docs.appimage.org/packaging-guide/converting-binary-packages/pkg2appimage.html

## How do I use your script?
First of all, you gonna need NodeJS to run it. It probably can be rewritten in Bash, but right now, it's in Node.

Once you have Node installed, open the project folder with the terminal and run the following command to install Wine 6.0.4 (stable):

```
node ./build.js
```

In case you need to create an AppImage for any other Wine version, just add them as arguments, like the examples below:
```
node ./build.js stable 6.0.4
node ./build.js devel 7.13
node ./build.js staging 6.10
```

The created AppImage will be inside the build/out folder.