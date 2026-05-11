# Fishingshop

Projekt wykonany w ramach pracy inżynierskiej.

## Opis projektu

**Fishingshop** to aplikacja internetowa sklepu wędkarskiego, przygotowana jako projekt inżynierski.

Aplikacja składa się z części frontendowej oraz backendowej. Backend odpowiada za obsługę logiki aplikacji i komunikację z bazą danych, natomiast frontend umożliwia użytkownikowi korzystanie z aplikacji przez interfejs graficzny.

## Wymagania systemowe

Do uruchomienia projektu lokalnie wymagane są następujące narzędzia:

- **PostgreSQL**
- **pgAdmin**
- **Node.js** wraz z menedżerem pakietów **npm**

Wszystkie potrzebne biblioteki i frameworki zostaną zainstalowane automatycznie po uruchomieniu polecenia `npm install`.

## Przygotowanie bazy danych

1. Otwórz **pgAdmin**.
2. Połącz się z serwerem PostgreSQL, na przykład **PostgreSQL 16**.
3. Utwórz nową bazę danych:
   - kliknij prawym przyciskiem myszy na **Databases**,
   - wybierz **Create → Database…**,
   - wpisz nazwę bazy, na przykład `sklep_wedkarski`,
   - zatwierdź utworzenie bazy danych.

## Import pliku SQL

1. Kliknij utworzoną bazę danych, na przykład `sklep_wedkarski`.
2. Wybierz **Tools → Query Tool**.
3. W górnym menu wybierz **File → Open…**.
4. Wskaż plik:

```bash
sklep_wedkarski.sql
