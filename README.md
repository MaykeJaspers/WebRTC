## Space Dodger

Space Dodger is a browser-based game where the player controls a spaceship using their phone as a controller. The goal is to survive as long as possible while avoiding enemies and collecting stars to increase your score.

The project connects a desktop and a phone in real time, creating a simple two-device gaming experience.



## Concept

The idea was to build a game where input does not come from a keyboard, but from a second device. The phone acts as a controller and connects to the desktop via a QR code.

This makes the game more interactive and demonstrates how multiple devices can communicate in real time within a web application.



## Features

* Real-time connection between desktop and phone
* QR code system to connect the controller
* WebRTC data channel for low-latency input
* WebSockets used for signalling only
* Movement controls (up, down, left, right)
* Action button to remove nearby enemies
* Increasing difficulty over time
* Score system and survival timer
* Collectible stars for bonus points
* Start screen before gameplay
* Restart functionality
* Styled UI with a neon/arcade theme



## How to run the project

1. Install dependencies:

```bash
npm install
```

2. Start the server:

```bash
npm start
```

3. Open the game:

```text
http://localhost:3000
```



## Using the phone as controller

To connect a phone, both devices must be on the same Wi-Fi network.

Important:

* Opening the project via `localhost` only works on the same device
* To connect a phone, open the desktop page using the computer’s local IP address

Example:

```text
http://192.168.x.x:3000
```

Then:

* open this link on the computer
* scan the QR code with the phone
* the phone will connect as a controller



## How to play

* Use the directional buttons on your phone to move the spaceship
* Avoid the red enemies
* Collect stars to gain extra points
* Use the action button to remove nearby enemies
* Survive as long as possible



## Development process

I started by setting up an Express server and adding WebSocket support for communication between devices. After that, I implemented a session system so a desktop and a phone could connect to each other.

Next, I added WebRTC data channels to send real-time input from the phone to the desktop. Once the connection was stable, I focused on building the game logic, including movement, enemies, scoring, and difficulty scaling.

Finally, I improved the user interface by adding a start screen, a restart system, and styling to make the game feel more complete.



## Challenges

One of the main challenges was setting up the communication between the phone and the desktop. Especially the WebRTC signalling process required careful debugging.

Another challenge was understanding how local networking works. Initially, the phone could not connect because the project was opened using `localhost` instead of the local IP address.



## What I learned

* How WebSockets and WebRTC work together
* How to connect multiple devices in a web application
* How to handle real-time input and game loops
* The importance of testing on real devices
* How small UI changes can improve user experience



## Bonus feature (tilt control)

I experimented with tilt controls using the phone’s motion sensors as an extra feature. The idea was to allow the player to control the spaceship by tilting their phone.

While the basic implementation was set up, I noticed that sensor access depends heavily on the device and browser, and sometimes requires specific permissions or settings. Because reliability was important for the final version, I kept the button controls as the main input method.



## Possible improvements

If I had more time, I would:

* improve animations and visual effects
* add sound effects and music
* expand gameplay (e.g. lives system or different enemy types)
* make tilt controls more stable across devices
* deploy the project online so it works without local setup



## AI usage

I used AI tools mainly to help debug issues and understand concepts like WebRTC and networking. For example, I used it to better understand how to structure the signalling and data channel communication.

I did not directly copy all generated code, but tested and adjusted it to fit my project. In several cases I modified the logic and UI based on my own ideas.

AI helped me work more efficiently, but I made sure I understood how everything works.

---
