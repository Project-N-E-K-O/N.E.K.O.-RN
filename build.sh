nvm use v20

npx expo prebuild --platform android --clean

npm i

npx eas build --profile development --platform android --local
