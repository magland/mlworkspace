#!/bin/bash

echo "Post build..."

if [ -e postBuild ]
then
	echo "Running postBuild"
	bash postBuild
fi
