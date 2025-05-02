function formatYmdHisGmt7(seconds){
    const date = new Date((seconds + 7 * 3600) * 1000);

    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const secondsFormatted = String(date.getUTCSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${secondsFormatted}`;
}

function millisecondsGmt7(seconds){
    return (seconds + 7 * 3600) * 1000;
}

function isToday(seconds) {
    const inputDate = new Date(seconds * 1000);
    const now = new Date();
  
    return (
      inputDate.getFullYear() === now.getFullYear() &&
      inputDate.getMonth() === now.getMonth() &&
      inputDate.getDate() === now.getDate()
    );
}

function getFormattedDate() {
    const now = new Date();
  
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // getMonth is zero-based
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
  
    return `${year}_${month}_${day}_${hours}_${minutes}_${seconds}`;
}

const getMondaySaturday = () => {
    const now = new Date();
    const day = now.getDay(); // 0 (Sun) to 6 (Sat)
    const diffToMonday = (day === 0 ? -6 : 1) - day; // if Sunday, go back 6 days
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
  
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);
    saturday.setHours(23, 59, 59, 999);
  
    return { monday, saturday };
};

const getTodayStartEndDate = () => {
    const today = new Date();

    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const formatDateTime = (date) => {
        const pad = (n) => (n < 10 ? '0' + n : n);
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    };

    return {
        startOfDay: formatDateTime(startOfDay),
        endOfDay: formatDateTime(endOfDay),
    };
}

export {
    formatYmdHisGmt7,
    millisecondsGmt7,
    isToday,
    getFormattedDate,
    getMondaySaturday,
    getTodayStartEndDate
};
