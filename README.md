# Escape the Compiler

A virtual, team-based DSA escape room built as a single web page. The system has crashed and your team is trapped inside the compiler. Solve 5 coding rooms, collect the code pieces and reboot the system before time runs out.

Built by **[Your DSA Community Name]** for **[Fest Name], [College Name]**.

**Live site:** [add your GitHub Pages or Netlify link here]

---

## How the game works

1. A team logs in with a Team ID (`TEAM01` to `TEAM10`), a team name and the event passcode.
2. The 90-minute master timer starts.
3. The team opens a room. Each room has its own 15-minute timer, which starts when the room is first opened.
4. The team writes JavaScript in the editor and presses **Run tests**.
5. When all tests pass, the room is solved and one code piece is revealed.
6. After all rooms are finished, the team enters the final 4-digit code and the password word to escape.

## The five rooms

| Room | Topic | Mission |
|---|---|---|
| 1. Stack Room | Stack | Evaluate a postfix expression |
| 2. Array Room | Binary search | Search a rotated sorted array |
| 3. Graph Room | BFS | Return the BFS visit order of a graph |
| 4. Debug Room | Debugging | Find and fix the bug in a function |
| 5. Cipher Room | Logic | Decode a Caesar cipher |

## Scoring

| Item | Points |
|---|---|
| Room solved | +100 |
| Solved within 10 minutes of opening the room | +30 |
| Each hint used (3 per room) | -20 |
| Escaping the system | +50 |
| Room runs out of time | Closed, no points (code piece is still given) |

Highest score wins. Ties go to the faster finish time.

## Run it locally

No installation needed.

1. Download or clone this repository.
2. Open `index.html` in any modern browser.

## Deploy it

- **GitHub Pages:** Settings, then Pages, choose the `main` branch and `/ (root)`.
- **Netlify:** drag the folder containing `index.html` onto app.netlify.com/drop.

## Project structure

| Path | Purpose |
|---|---|
| `index.html` | The whole game: page, styles and logic |
| `README.md` | This file |
| `CONTRIBUTING.md` | How to contribute |
| `docs/` | Event plan and posters (optional) |

## Known limitations

- The leaderboard is stored in the browser, so it is per device, not shared.
- Passcode, answers and tests live in the page code, so anyone can read them. Do not use the public version for a real contest.
- Everything is checked in the browser. A backend would be needed for shared scores and hidden tests.

## Contributing

Contributions are welcome: new rooms, bug fixes, better hints, accessibility and design improvements. Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

Ideas on the roadmap:

- Live shared leaderboard
- Organizer dashboard
- Randomized puzzles per team
- More rooms (trees, linked lists, sorting, recursion)
- Sound effects and confetti

## License

MIT License. See the `LICENSE` file.
