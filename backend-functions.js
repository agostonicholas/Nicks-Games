export async function saveScore(game, user, score){
    try {
        const response = await fetch('https://nicks-games-backend.onrender.com/api/save-score', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ game, user, score })
        });
    const data = await response.json();
    console.log('Score saved:', data);
    } catch (error) {
        console.error('Error saving score:', error);
    }
}

export async function getLeaderboard(){
    try {
        const response = await fetch('https://nicks-games-backend.onrender.com/getLeaderboard', {
            method: 'GET',
            headers: {'Content-Type': 'application/json'},
        });
        const data = await response.json();
        console.log('Leaderboard data: ', data);
        return data;
    } catch (error) {
        console.error('Error fetching leaderboard: ', error);
        return [];
    }
}

export async function registerUser(username,password){
    try {
        const response = await fetch('https://nicks-games-backend.onrender.com/register',{
            method: 'POST',
            headers: {'Content-type': 'application/json'},
            body: JSON.stringify({ username, password })
        })
        const data = await response.json();
        console.log('registered user: ', data);
        return data;
    } catch (error) {
        console.error('error registering user: ', error);
    }
}