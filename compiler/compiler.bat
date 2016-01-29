::java -jar compiler.jar --help
::SIMPLE/ADVANCED_OPTIMIZATIONS QUIET/VERBOSE
SET f=../assets/main
java -jar compiler.jar --compilation_level=SIMPLE_OPTIMIZATIONS --warning_level=QUIET --js=%f%.js --js_output_file=%f%-min.js
pause