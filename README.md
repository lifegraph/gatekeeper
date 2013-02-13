gate-keeper
===========

Server to sync the device IDs to Facebook users

get it working for your app
===========
- Go set up a Facebook app developer.facebook.com/apps
- Set your App Domains in Basic Info to be fb-gate-keeper.herokuapp.com
- Make sure "Website with Facebook Login" is clicked and set the Site URL to be http://fb-gate-keeper.herokuapp.com
- Go to fb-gate-keeper.herokuapp.com/:yourapp/admin where :yourapp is your namespace
- Copy in your Facebook App Key, Secret Key
- Set your permissions for your app, comma separated with no space such as "user_actions.music,friends_actions.music,user_likes,friends_likes"
- Set the URL that you want people to go to after sending them to http://fb-gate-keeper.herokuapp.com/:yourapp/login and they finish syncing their device
- Click update or whatever (there will be no indication that it worked besides everything will be deleted in the form)
- Send your loyal subjects to http://fb-gate-keeper.herokuapp.com/:yourapp/login
