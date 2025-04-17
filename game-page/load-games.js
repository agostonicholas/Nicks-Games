fetch("../game-page/games.json")
  .then(response => response.json())
  .then(games => {
    games.forEach(game => {
      const gameCard = document.createElement("div");
      gameCard.classList.add("game-card");
      let imageHTML = game.image ? `<a href= ${game.link}><img src="${game.image}" alt="${game.name}"height= 200px width= 150px></a>` : "";
      gameCard.innerHTML = `
        ${imageHTML}
        <h3>${game.name}</h3>
        <a href="${game.link}?id=${game.id}" class="play-button">Play Now</a>
      `;
      document.querySelector(".game-grid").appendChild(gameCard);
    });
  });