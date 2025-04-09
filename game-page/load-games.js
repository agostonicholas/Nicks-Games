fetch("games.json")
  .then(response => response.json())
  .then(games => {
    games.forEach(game => {
      const gameCard = document.createElement("div");
      gameCard.classList.add("game-card");
      gameCard.innerHTML = `
        <img src="${game.image}" alt="${game.name}">
        <h3>${game.name}</h3>
        <p>${game.description}</p>
        <a href="${game.link}" class="play-button">Play Now</a>
      `;
      document.querySelector(".game-grid").appendChild(gameCard);
    });
  });