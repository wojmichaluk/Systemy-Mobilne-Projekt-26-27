## Postępy prac nad projektem

W tym pliku opisujemy postępy prac nad projektem w każdym tygodniu.

#### Tydzień 12.10 - 18.10

W tym tygodniu wspólnie ustaliliśmy 2 propozycje na aplikację, którą byśmy chcieli
napisać w ramach projektu: aplikacja, która wysyła powiadomienia o zajęciach lub
budzik z mini-grą do rozwiązania, aby go wyłączyć.
Po dokładniejszym zbadaniu sytuacji, z powodu spodziewanych problemów z integracją
z API systemu USOS, zdecydowaliśmy się na tę drugą opcję.
Uzgodniliśmy ten pomysł z Prowadzącym na zajęciach i po jego zaakceptowaniu
założyliśmy to repozytorium, w którym będziemy rozwijać aplikację.

#### Tydzień 19.10 - 25.10

W tym tygodniu zapoznawaliśmy się z wybranymi technologiami, które będziemy
wykorzystywać w pisaniu aplikacji.
Planujemy w najbliższym czasie utworzyć projekt we wstępnej postaci oraz dodać
funkcjonalność budzika (na razie "zwykłego"), później stopniowo dodając
usprawnienia.

#### Tydzień 26.10 - 01.11

W tym tygodniu stworzyliśmy projekt aplikacji z wykorzystaniem infrastruktury
[Expo](https://expo.dev/).
Program we wstępnej postaci obsługuje podstawowe funkcjonalności budzika.
Pokazuje on aktualną godzinę, pozwala dostosować dokładną godzinę i minutę
alarmu, a kiedy ten czas nadchodzi, wysyła powiadomienie i pozwala wyłączyć
budzik.

#### Tydzień 02.11 - 08.11

W tym tygodniu planowaliśmy, jakie mini-gry dodać do aplikacji.
Zamierzamy w najbliższym czasie stopniowo rozwijać projekt, dodając
kolejne mini-gry do programu i losując jedną z nich, której
ukończenie jest konieczne, aby wyłączyć ustawiony budzik.

#### Tydzień 09.11 - 15.11

W tym tygodniu dodaliśmy pierwszą minigrę do aplikacji: **Sudoku**
(w uproszczonej wersji 4x4 - 4 kwadraty o wymiarach 2x2, uzupełniane
cyframi od 1 do 4, na zasadach zwykłego Sudoku).
Na razie plansza początkowa nie jest generowana, tylko sztywno wpisana
w kodzie, ale pozostałe elementy logiki gry i styl są ukończone.
Następnym krokiem będzie uogólnione generowanie losowej planszy.

#### Tydzień 16.11 - 22.11

W tym tygodniu dodaliśmy kolejną grę do aplikacji - sekwencja
prostych aktywności, w 3 krokach: złapanie ruszającego się kółka,
przytrzymanie przycisku oraz odtworzenie kolejności migania elementów
(_Simon Says_).
Połączyliśmy zmiany wynikające z dodania obu gier i przygotowaliśmy
ogólny szkielet aplikacji, który pozwala w łatwy sposób dodawać
kolejne minigry.
