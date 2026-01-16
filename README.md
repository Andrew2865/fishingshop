# Fishingshop

Projekt wykonany w ramach pracy inżynierskiej.

## Wymagania systemowe

Do uruchomienia projektu wymagane są następujące narzędzia:
- PostgreSQL  
- Node.js (wraz z menedżerem pakietów npm)

Wszystkie niezbędne biblioteki i frameworki zostaną zainstalowane automatycznie podczas instalacji zależności.

## Uruchomienie projektu

1. Sklonuj repozytorium na komputer lokalny.
2. Otwórz dwa okna wiersza poleceń (CMD lub terminal):
   - jedno w katalogu `backend`
   - drugie w katalogu `frontend`

### Backend

W katalogu `backend` uruchom polecenia:

npm install
node server.js

W katalogu `frontend` uruchom polecenia:

npm install
npm start

pgAdmin 

Otwórz pgAdmin i połącz się z serwerem (np. PostgreSQL 16).

Utwieramy bazę danych:

PPM na Databases → Create → Database…

Nazwa np. sklep_wedkarski (albo jaką masz w projekcie)

Import pliku .sql:

Kliknij bazę sklep_wedkarski → Tools → Query Tool

File → Open… i wybierz sklep_wedkarski.sql

Klikamy Execute 

Po chwili powinny pojawić się tabele w:
Schemas → public → Tables
