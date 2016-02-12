::java -jar compiler.jar --help
::SIMPLE/ADVANCED_OPTIMIZATIONS QUIET/VERBOSE
SET p=..\assets\
SET f=%p%out
copy /B %p%functions.js+%p%objects.js+%p%main.js  %f%.js
java -jar compiler.jar --compilation_level=ADVANCED_OPTIMIZATIONS --warning_level=VERBOSE --js=%f%.js --js_output_file=%f%-min.js
del %f%.js
pause