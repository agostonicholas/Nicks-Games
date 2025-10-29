// script to fetch the game details and display them on the page

fetch("/games.json")
  .then(response => response.json())
  .then(games => {
    // Get the game ID from the URL
    const params = new URLSearchParams(window.location.search);
    const gameID = params.has("id") ? params.get("id") : "1"; // fallback to "1" if none provided

    // Find the matching game in the JSON data
    const game = games.find(game => game.id == gameID);

    // Create elements
    const gameNameEl = document.createElement("h3");
    const gameDescriptionEl = document.createElement("p");

    // Fill in the content
    gameNameEl.textContent = game.name;
    gameDescriptionEl.textContent = game.description;

    // Append to the page
    const container = document.querySelector(".game-details");
    container.appendChild(gameNameEl);
    container.appendChild(gameDescriptionEl);
  });
