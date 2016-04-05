::java -jar compiler.jar --help
::SIMPLE/ADVANCED_OPTIMIZATIONS QUIET/VERBOSE
SET i=..\assets\
SET o=..\bin\
copy /B ..\favicon.ico  %o%favicon.ico
xcopy ..\img %o%img /s/y
java -jar yui.jar %i%main.css -o %o%min.css --charset utf-8
copy /B %i%functions.js+%i%objects.js+%i%main.js  %o%max.js
java -jar closure.jar --compilation_level=ADVANCED_OPTIMIZATIONS --warning_level=VERBOSE --js=%o%max.js --js_output_file=%o%min.js
del %o%max.js
pause