// Simple navigation fix for popup
console.log('Navigation fix loaded');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Setting up simple navigation...');

    // Current page tracker
    let currentPage = 0;

    // Get navigation elements
    const leftArrow = document.getElementById('leftArrow');
    const rightArrow = document.getElementById('rightArrow');
    const pages = document.querySelectorAll('.page');
    const dots = document.querySelectorAll('.dot');

    console.log('Found elements:', {
        leftArrow: !!leftArrow,
        rightArrow: !!rightArrow,
        pages: pages.length,
        dots: dots.length
    });

    function showPage(pageIndex) {
        console.log('Showing page:', pageIndex);

        // Hide all pages
        pages.forEach(page => page.classList.remove('active'));
        // Show target page
        if (pages[pageIndex]) {
            pages[pageIndex].classList.add('active');
        }

        // Update dots
        dots.forEach(dot => dot.classList.remove('active'));
        if (dots[pageIndex]) {
            dots[pageIndex].classList.add('active');
        }

        // Update arrows
        if (leftArrow) leftArrow.disabled = pageIndex === 0;
        if (rightArrow) rightArrow.disabled = pageIndex === pages.length - 1;

        currentPage = pageIndex;
    }

    // Setup left arrow
    if (leftArrow) {
        leftArrow.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Left arrow clicked');
            if (currentPage > 0) {
                showPage(currentPage - 1);
            }
        });
    }

    // Setup right arrow
    if (rightArrow) {
        rightArrow.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Right arrow clicked');
            if (currentPage < pages.length - 1) {
                showPage(currentPage + 1);
            }
        });
    }

    // Setup dots
    dots.forEach((dot, index) => {
        dot.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Dot clicked:', index);
            showPage(index);
        });
    });

    // Initialize first page
    showPage(0);

    console.log('Navigation setup complete');
});
