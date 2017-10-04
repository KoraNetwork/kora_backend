# Comments about the `images` folder

To serve dynamicaly uploaded files on production environment it needs to change grunt sync task (but I don't know how now) or allows serving static content with Apache or Nginx using `sails www --prod`. After running `sails www --prod` you can symlink `images` folder to generated `www`. Maybe there are better solution :)
