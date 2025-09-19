let htmlbtn = document.getElementById('html');
let cssbtn = document.getElementById('css');
let resultbtn = document.getElementById('result');

let htmlCode = document.getElementById("htmlCode");
let cssCode = document.getElementById("cssCode");
let resultcode = document.getElementById("resultcode"); // should be an <iframe>


htmlbtn.addEventListener('click', () => {
    htmlCode.style.display = "block";
    cssCode.style.display = "none";
    resultcode.style.display = "none";
});
cssbtn.addEventListener('click', () => {
    htmlCode.style.display = "none";
    cssCode.style.display = "block";
    resultcode.style.display = "none";
});
resultbtn.addEventListener('click', () => {
    htmlCode.style.display = "none";
    cssCode.style.display = "none";
    resultcode.style.display = "block";
    updateResult();
});

function updateResult() {
    let html = htmlCode.value;
    let css = "<style>" + cssCode.value + "</style>";
    resultcode.srcdoc = html + css;
}
