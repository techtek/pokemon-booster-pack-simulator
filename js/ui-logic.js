// Global variables. Card and set info is isolated in other js files already loaded on index.html
let uiViewType = "singlePackFlip"; // This must remain global so that the card-logic.js file can access it easily (tho' I could use a closure instead)
let pulledPacks = [];
let currentSet = null;
// -----------------------
// UI
function setDisplay(sortOption) {
    displayOption = document.querySelector(".select-display").value;
    uiViewType = displayOption;
    switch (displayOption) {
        case "singlePackFlip":
            showElement(".button.select-row-view-sorting", false);
            showElement(".magnifying-glass.mobile-only", true);
            // Only want to display the most recently opened pack for now. TODO: allow user to toggle through packs opened via carousel
            singlePackFlip(pulledPacks[pulledPacks.length - 1].packArtUrls, pulledPacks[0].cards);
            break;
        case "rowView":
            showElement(".button.select-row-view-sorting", true);
            showElement(".magnifying-glass.mobile-only", false);
            if (sortOption !== null)
                deleteChildrenFrom(["single-pack-flip-area", "row-view", "grid-view"]);
            else
                deleteChildrenFrom(["single-pack-flip-area", "grid-view"]);
            pulledPacks.forEach(pack => { displayRowView(pack.packArtUrls, pack.cards, sortOption) })
            break;
        case "gridView":
            pulledPacks.forEach(pack => displayGridView(pack.packArtUrls, pack.cards, sortOption));
        default:
            console.log("Somehow we've passed a nonexistent view type. This should be impossible.")
    }
}

function buildCardHTML(classesToAdd, imageUrl, hiResImageUrl, cardType) {
    const card = document.createElement("div");
    card.classList.add(...classesToAdd);
    if (cardType === "packArt")
        card.style.backgroundImage = "url('" + imageUrl + "')";
    else
        card.style.backgroundImage = "url('../images/site/pokeball-loading.gif')";
    preloadImage(card, imageUrl, cardType);
    card.setAttribute("data-card-image", imageUrl);
    card.setAttribute("data-card-image-hi-res", hiResImageUrl);
    return card;
}

function buildPackArtHTML(packArtUrls) {
    const packArt = document.createElement("div")
    packArt.classList.add("pack-art", "pulled-card");

    const packArtFrontDiv = document.createElement("div");
    packArtFrontDiv.classList.add("pack-art-front");
    const packArtFront = new Image();
    packArtFront.src = packArtUrls.front;
    packArtFrontDiv.appendChild(packArtFront);
    packArt.appendChild(packArtFrontDiv);

    const packArtBackDiv = document.createElement("div");
    packArtBackDiv.classList.add("pack-art-back");
    const packArtBack = new Image();
    packArtBack.src = packArtUrls.back;
    packArtBackDiv.appendChild(packArtBack);
    packArt.appendChild(packArtBackDiv);
    
    // Can't use an arrow function here, since I need the "this" context of the div clicked
    packArt.addEventListener("click", function() { 
        this.classList.toggle("flipped");
    });

    return packArt;
}

// https://www.sitepoint.com/community/t/onload-for-background-image/6462
function preloadImage(card, imageUrl, cardType) {
    const img = new Image();
    img.onload = () => onImageLoaded(card, cardType);
    img.src = imageUrl;
}

function onImageLoaded(card, cardType) {
    const loadedImageUrl = card.getAttribute("data-card-image");
    if (cardType === "reverseHolo") {
        card.style.backgroundImage = "url('" + loadedImageUrl + "'), url('../images/site/foil.jpg')";
        card.classList.add("reverse-holo");
    }
    else 
        card.style.backgroundImage = "url('" + loadedImageUrl + "')";
    card.classList.remove("loading");
}

function zoomCard(hiResImageUrl) {
    const div = document.getElementById("hi-res-card");
    div.setAttribute("data-card-image", hiResImageUrl);
    preloadImage(div, hiResImageUrl);
    // div.style.backgroundImage = "url('" + hiResImageUrl + "')";
    const modal = document.getElementById("card-zoom");
    modal.style.display = "block";
}

function deleteChildrenFrom(parentNodes) {
    parentNodes.forEach(node => { document.getElementById(node).innerHTML = "" });
}

// UI - single pack flip
function singlePackFlip(packArtUrls, pack) {
    deleteChildrenFrom(["single-pack-flip-area", "row-view", "grid-view"]);
    const target = document.getElementById("single-pack-flip-area");
    const packArtFront = buildCardHTML(["card", "pack-art-card", "card--current"], packArtUrls.front, "none", "packArt");
    target.append(packArtFront);
    for (let i = 0; i < pack.length; i++) {
        let card;
        if (pack[i].rarity === "Holo Rare" || pack[i].rarity === "Secret Rare") {
            card = buildCardHTML(["card", "loading", "confetti"], pack[i].imageUrl, pack[i].imageUrlHiRes);
        } else if (pack[i].isReverseHolo === true) {
            // We have two types of reverse holo. First, the one we have image urls for
            if (pack[i].set === "Legendary Collection")
                card = buildCardHTML(["card", "loading"], pack[i].imageUrlReverseHolo, pack[i].imageUrlReverseHolo, "reverseHolo");
            // And second, the one we apply a css filter for
            else 
                card = buildCardHTML(["card", "loading"], pack[i].imageUrl, pack[i].imageUrlHiRes, "reverseHolo");
        } else {
            card = buildCardHTML(["card", "loading"], pack[i].imageUrl, pack[i].imageUrlHiRes);
        }
        card.addEventListener("contextmenu", (e) => {
            e.preventDefault(); 
            if (pack[i].set === "Legendary Collection" && pack[i].isReverseHolo)
                zoomCard(pack[i].imageUrlReverseHolo);
            else 
                zoomCard(pack[i].imageUrlHiRes);

        });
        target.appendChild(card);
    }
    $('.cards').commentCards();
}

// Flip through stack of cards modified from https://codepen.io/shshaw/pen/KzYXvP
$.fn.commentCards = function () {
    // Closure...but why?
    return this.each(function () {
        var $this = $(this),
            $cards = $this.find('.card'),
            $current = $cards.filter('.card--current'),
            $next;

        // The crucial changes here was in three parts
        $cards.on('click', function () {
            if ($current.is(this)) { // First, I wanted the condition to only apply to the current card, NOT everything else (so I took the bang out)
                
                $cards.removeClass('card--current card--out card--next');
                $current.addClass('card--out');
                $current = $(this).next().length === 1 ? $(this).next().addClass('card--current') : $cards.first().addClass('card--current'); // Second, I added a ternary here to apply the "card-current" class to the next item if there is one, or if not, then the first item
                $next = $current.next().length === 1 ? $current.next() : $cards.first(); // Likewise, and finally, I wanted to apply "card--next" class to the item after the current item if there is one, and if not, then the first card
                $next.addClass('card--next');
                if ($current.hasClass("confetti")){
                    setTimeout(() => {
                        $current.removeClass("confetti");
                        confetti({particleCount: 200, gravity: .5, origin: {y: .7}, spread: 90});
                    }, 500);
                }
            }
        });

        if (!$current.length) {
            $current = $cards.first();
            $cards.first().trigger('click');
        }

    })
};

// -----------------------
// UI - row view
function displayRowView(packArtUrls, pack, sortOption = null) {
    const packWrapper = document.createElement("div");
    packWrapper.classList.add("open-pack");
    document.getElementById("row-view").prepend(packWrapper);

    const packArt = buildPackArtHTML(packArtUrls);
    packWrapper.appendChild(packArt);

    // Sort cards in pack before rendering
    if (sortOption !== null)
        pack = sortThis(pack, sortOption);

    // For some unfathomable reason I can't create img tags, or the flexbox overflow-y breaks. Must use div tags
    for (let i = 0; i < pack.length; i++) {

        let card;
        if (pack[i].set === "Legendary Collection" && pack[i].isReverseHolo) {
            card = buildCardHTML(["pulled-card", "loading"], pack[i].imageUrlReverseHolo);
            packWrapper.appendChild(card);
            card.addEventListener("click", () => zoomCard(pack[i].imageUrlReverseHolo));
        }
        else {
            card = buildCardHTML(["pulled-card", "loading"], pack[i].imageUrl);
            packWrapper.appendChild(card);
            card.addEventListener("click", () => zoomCard(pack[i].imageUrlHiRes));
        }

        // But I can use img tags for the rarity markers
        const raritySymbol = document.createElement("img");
        raritySymbol.classList.add("rarity");
        if (pack[i].rarity === "Common")
            raritySymbol.src = "../images/site/rarity_common.png";
        if (pack[i].rarity === "Uncommon")
            raritySymbol.src = "../images/site/rarity_uncommon.png";
        if (pack[i].rarity === "Holo Rare" || pack[i].rarity === "Rare" || pack[i].rarity === "Secret Rare")
            raritySymbol.src = "../images/site/rarity_rare.png";
        card.appendChild(raritySymbol)
    };

    // Event delegation for horizontal scrolling from https://stackoverflow.com/questions/11700927/horizontal-scrolling-with-mouse-wheel-in-a-div
    packWrapper.addEventListener("wheel", e => {
        const toLeft = e.deltaY < 0 && packWrapper.scrollLeft > 0;
        const toRight = e.deltaY > 0 && packWrapper.scrollLeft < packWrapper.scrollWidth - packWrapper.clientWidth;

        if (toLeft || toRight) {
            e.preventDefault();
            packWrapper.scrollLeft += e.deltaY;
        }
    });
}

function setRowViewSort() {
    const sortOption = document.querySelector(".select-row-view-sorting").value;
    setDisplay(sortOption);
}

function sortThis(pack, sortOption) {
    // Magic from https://afewminutesofcode.com/how-to-create-a-custom-sort-order-in-javascript
    let sortedPack, sortBy;
    const customSort = ({ data, sortBy, sortField }) => {
        const sortByObject = sortBy.reduce((obj, item, index) => {
            return {
                ...obj,
                [item]: index
            }
        }, {})
        return data.sort((a, b) => sortByObject[a[sortField]] - sortByObject[b[sortField]])
    }

    switch (sortOption) {
        case "rarityDescending":
            sortBy = ["Common", "Uncommon", "Rare", "Holo Rare", "Secret Rare"];
            sortedPack = customSort({ data: pack, sortBy, sortField: 'rarity' });
            break;
        case "rarityAscending":
            sortBy = ["Secret Rare", "Holo Rare", "Rare", "Uncommon", "Common"];
            sortedPack = customSort({ data: pack, sortBy, sortField: 'rarity' });
            break;
        case "packOrder":
            sortedPack = pack.sort((a, b) => { return parseInt(a.pullOrder) - parseInt(b.pullOrder)})
            break;
        case "setNumberAscending":
            sortedPack = pack.sort((a, b) => { return parseInt(a.number) - parseInt(b.number)})
            break;
        case "setNumberDescending":
            sortedPack = pack.sort((a, b) => { return parseInt(b.number) - parseInt(a.number)})
            break;
    }
    return sortedPack;
}

// TODO: Abstract this into a showElement function that takes in an array and spreads it
function showElement(selector, bool) {
    el = document.querySelector(selector);
    if (bool) 
        el.classList.remove("hide");
    else 
        el.classList.add("hide");
}

// -----------------------
// UI - grid view
function displayGridView(packArt, pack, sortOption) {
    console.log("running displayGridView");
}

// -----------------------
// UI - Event listeners
// When the user clicks anywhere outside of the modal, close it
const modal = document.getElementById("card-zoom");
modal.onclick = function (e) {
    if (e.target !== document.getElementById("hi-res-card")) {
        modal.style.display = "none";
        document.getElementById("hi-res-card").style.backgroundImage = "url('../images/site/pokeball-loading.gif')";
    }
}

const openPackButtons = document.querySelectorAll(".open-pack-button");
openPackButtons.forEach(button => button.onclick = () => { 
    openPack(currentSet) 
});

const magnifyingGlass = document.querySelector(".magnifying-glass");
magnifyingGlass.addEventListener("click", () => {
    const currentCard = document.querySelector(".card--current");
    const hiResUrl = currentCard.getAttribute("data-card-image-hi-res");
    if (hiResUrl !== "none") 
        zoomCard(hiResUrl);
})


// -----------------------
// Initialization
// TODO: retrieve user's choice from localStorage
chooseSet();
showElement(".button.select-row-view-sorting", false);