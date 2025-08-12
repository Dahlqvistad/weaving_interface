mkdir -p app.iconset

# Base sizes Apple expects in a .iconset
for s in 16 32 128 256 512; do
  # 1x
  magick -density 1024 -background none src/images/app.svg \
    -alpha on -resize ${s}x${s} \
    PNG32:app.iconset/icon_${s}x${s}.png

  # 2x (retina)
  magick -density 1024 -background none src/images/app.svg \
    -alpha on -resize $((s*2))x$((s*2)) \
    PNG32:app.iconset/icon_${s}x${s}@2x.png
done

# Build the .icns (macOS)
mkdir -p assets
iconutil -c icns app.iconset -o assets/app-icon.icns
rm -rf app.iconset