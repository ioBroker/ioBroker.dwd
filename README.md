![Logo](admin/dwd.png)
# ioBroker.dwd

Dieser Adapter lädt per FTP Wetterwarnungen vom deutschen Wetterdienst.

Anmeldung zur Grundversorgung des DWD, freier Direktzugriff
Der Deutsche Wetterdienst bietet viele, der zur Grundversorgung (Katalog) gehörenden meteorologischen Daten, Produkte und Spezialdienstleistungen (Katalog) über FTP im freien Direktzugriff an.

Registrieren können Sie sich über den folgenden Link:
[http://kunden.dwd.de/gdsRegistration/gdsRegistrationStart.do](http://kunden.dwd.de/gdsRegistration/gdsRegistrationStart.do)

mit Ihrer Email-Adresse und Sie erhalten von uns nach einer Email-Bestätigung die FTP-Zugangsdaten (User, Password), mit denen Sie sich ca. 1 Stunde später einloggen können.

Dann können sie die Wetterinformationen vom FTP-Server herunterladen.
Hierzu bieten sich verschiedene Programme an:

- z.B. Filezilla oder Total Commander etc., die diesen FTP-Transfer in übersichtlicher Form integriert haben.
- Über Ihren Browser können Sie den Dienst auch nutzen mit ftp://username:password@ftp-outgoing2.dwd.de (Hier müssen Sie Ihren "username" und Ihr "password" einsetzen).

## Changelog
### 0.1.7 (2015-03-04)
* (bluefox) change the codes of regions

### 0.1.6 (2015-02-14)
* (bluefox) fix "forecast" object

### 0.1.5 (2015-01-02)
* (bluefox) fix timeout problem under windows

### 0.1.3 (2015-01-02)
* (bluefox) start adapter one time on config change or restart

### 0.1.2 (2015-01-02)
* (bluefox) enable npm install

### 0.1.1 (2014-11-22)
* (bluefox) change variables to no-"io.*"

### 0.1.0 (2014-10-25)
* (bluefox) change variables to io.*

### 0.0.4 (2014-10-23)
* (bluefox) support of timeouts

### 0.0.3 (2014-10-22)
* (bluefox) fix error if ftp problem

## Todo

* Handle FTP timeouts

## License

The MIT License (MIT)

Copyright (c) 2014 hobbyquaker <hq@ccu.io>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
