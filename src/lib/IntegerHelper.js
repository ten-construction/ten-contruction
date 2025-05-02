function toRupiahFormat(number){
    if (typeof number !== 'number') return number;
  
    return 'Rp ' + number.toLocaleString('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
}

export {
    toRupiahFormat
}