document.addEventListener("DOMContentLoaded", () => {
    const searchInputs = document.querySelectorAll(".srch-btn input");
    const searchBtns = document.querySelectorAll(".srch-btn button");

    const handleSearch = (input) => {
        const query = input.value.trim();
        if (query) {
            window.location.href = `/User/products.html?search=${encodeURIComponent(query)}`;
        }
    };

    searchInputs.forEach((input, index) => {
        input.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                handleSearch(input);
            }
        });
        
        if (searchBtns[index]) {
            searchBtns[index].addEventListener("click", () => {
                handleSearch(input);
            });
        }
    });
});
