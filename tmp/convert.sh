#!/bin/bash

# Source directory containing .ogg files
source_dir="./"

# Destination directory for converted .mp3 files
destination_dir="./"

# Loop through each .ogg file in the source directory
while true; do
    for ogg_file in "$source_dir"/*.ogg; do
        # Extract the filename and extension
        filename=$(basename "$ogg_file")
        extension="${filename##*.}"
        filename="${filename%.*}"

        # Generate the output .mp3 file path
        mp3_file="$destination_dir/$filename.mp3"

        # Check if the .mp3 file already exists
        if [ -f "$mp3_file" ]; then
            echo "Skipping $filename.mp3 - File already exists"
        else
            # Convert .ogg to .mp3 using ffmpeg
            ffmpeg -i "$ogg_file" "$mp3_file"
            echo "Converted $filename.ogg to $filename.mp3"
        fi
    done

    sleep 1
done
