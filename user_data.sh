#!/bin/bash
sudo yum install httpd -y

mkdir -p /var/www/html/users

cat <<EOF > /var/www/html/users/users.html
<!DOCTYPE html>
<html class="no-js" lang="en">
<head>
<title>ELB DevLab Demo</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Raleway:400,800">
<link rel='stylesheet' href="https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css">
<link rel="stylesheet" href="/css/bootstrap.min.css">
<link rel="stylesheet" href="/css/styles.css">
</head>
<style>

img {
    display: block;
    margin-left: auto;
    margin-right: auto;
}

body {
    background-image: url('https://www.exampleloadbalancer.com/assets/orange-checker-bg.png');
    background-repeat: no-repeat;
    background-attachment: fixed;
    background-size: cover;
    text-align: center;
}

.wrapper {
    text-align: center;
}

.button {
    background-color: #4CAF50;
    border: none;
    color: white;
    padding: 15px 32px;
    position: center;
    top: 50%;
}

iframe {
    width: 1500px; /* It should not be 100% */
    height: 500px;
    margin: auto;
    display: inline-block;
}
</style>
<body>

<h2>Congratulations, you are successfully authenticated. Enjoy the puppy!</h2>
<iframe src="https://giphy.com/embed/v6aOjy0Qo1fIA" width="431" height="480" align="middle" frameBorder="0" class="giphy-embed" allowFullScreen></iframe><p><a href="https://giphy.com/gifs/v6aOjy0Qo1fIA"></a>

</body>
EOF

cat <<EOF > /var/www/html/index.html
<!DOCTYPE html>
<html class="no-js" lang="en">
<head>
<title>ELB DevLab Demo</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Raleway:400,800">
<link rel='stylesheet' href="https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css">
<link rel="stylesheet" href="/css/bootstrap.min.css">
<link rel="stylesheet" href="/css/styles.css">    
</head>
<style>

img {
    display: block;
    margin-left: auto;
    margin-right: auto;
}

body 
{
    background-image: url('https://www.exampleloadbalancer.com/assets/orange-checker-bg.png');
    background-repeat: no-repeat;
    background-attachment: fixed;
    background-size: cover;
}

    
.wrapper {
    text-align: center;
}

.button {
    background-color: #4CAF50;
    border: none;
    color: white;
    padding: 15px 32px;
    position: center;

    top: 50%;
}
</style>

<body>
        <img src ="https://www.exampleloadbalancer.com/assets/feature_250x250_loadbalancer_application.png" alt="Logo" class="center">
        <font face="verdana"> <h3 style="color:white;" align="center">Elastic Load Balancing Authentication Demo</h3></font>
        
        <div class="wrapper">
        <button class="button" onclick="window.location.href = 'https://<ELB_DOMAIN>/users/users.html'">Login</button>
        </div>
</body>
</html>
EOF

chmod 644 /var/www/html/index.html /var/www/html/users/users.html
chown root.root /var/www/html/index.html /var/www/html/users/users.html

sudo chkconfig httpd on
sudo service httpd start 
