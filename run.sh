#!/bin/sh
# Run the app components
rm -fr ./server.log
npm run build
npm run start >> server.log &
tail -f server.log

