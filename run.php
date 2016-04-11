<!DOCTYPE html>
<html lang="en">
<head>
</head>
<body>
<?php
// exec("cmd /c START server\\run.bat");
popen("cmd /c START /min server\\run.bat", "r");

echo "<script>window.close();</script>";
?>
</body>
</html>
