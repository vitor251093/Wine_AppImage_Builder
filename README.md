# Wine_AppImage_Builder

Script that builds a Wine AppImage, so you can run Wine without installing it.

This project was based in the following projects:
- https://github.com/mmtrt/WINE_AppImage
- https://github.com/AppImage/pkg2appimage/pull/418/files

More details about pkg2appimage and its syntax here:
- https://github.com/AppImage/pkg2appimage
- https://docs.appimage.org/packaging-guide/converting-binary-packages/pkg2appimage.html

## How do I use your script?
With the project folder opened with the terminal, run the following command to install Wine 6.0.4 (stable):

```
./build.sh
```

In case you need to create an AppImage for any other Wine version, just add the version and build as arguments, like the examples below:
```
./build.sh stable 6.0.4
./build.sh devel 7.13
./build.sh staging 6.10
```

The created AppImage will be inside the dist folder.