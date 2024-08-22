var resize = document.querySelector("#resize")
var left = document.querySelector(".sideBar")
var container = document.querySelector(".mainWrapper")
var moveX = left.getBoundingClientRect().width + resize.getBoundingClientRect().width / 2

var drag = false
resize.addEventListener("mousedown", function (e) {
    drag = true
    moveX = e.x
})

container.addEventListener("mousemove", function (e) {
    moveX = e.x
    if (drag) {
        left.style.width = moveX - resize.getBoundingClientRect().width / 2 - 50 + "px"
        e.preventDefault()
    }
})

container.addEventListener("mouseup", function (e) {
    drag = false
})



// menu.addEventListener("mouseup", () => {
//     isOpen = !isOpen
//     if (isOpen) {
//         sideButtons.classList.add("sideButtonsOpen")
//     } else {
//         sideButtons.classList.remove("sideButtonsOpen")
//     }
// })



