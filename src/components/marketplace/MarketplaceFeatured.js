import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {MarketplaceImage} from "Components/common/Images";
import MarketplaceItemCard from "Components/marketplace/MarketplaceItemCard";

const FeaturedGallery = ({showIcons, marketplaceHash, items, selectedIndex, setSelectedIndex}) => {
  const width = showIcons ? 4 : 1;
  const [range, setRange] = useState([0, width]);
  const [dragging, setDragging] = useState(false);
  const [snap, setSnap] = useState(0);

  useEffect(() => {
    const relativeIndex = selectedIndex - range[0];

    if(!dragging) {
      // Specific item clicked or slider moved with keyboard - May need to adjust range

      if(width === 1) {
        setRange([selectedIndex, selectedIndex + 1]);
        return;
      }

      // First item clicked
      if(relativeIndex <= 0) {
        const newStart = Math.max(0, selectedIndex - width + 2);
        setRange([newStart, newStart + width]);
      }

      // Last item clicked - set to second from left
      if(relativeIndex >= width - 1) {
        const newEnd = Math.min(items.length, selectedIndex - 1 + width);
        setRange([Math.max(0, newEnd - width), newEnd]);
      }
    }
  }, [selectedIndex]);

  useEffect(() => {
    if(!dragging) { return; }

    if(range[0] > selectedIndex) {
      setSelectedIndex(range[0]);
    } else if(range[1] - 1 < selectedIndex) {
      setSelectedIndex(range[1] - 1);
    }
  }, [range]);

  const KeyboardControls = event => {
    switch(event.key) {
      case "ArrowLeft":
      case "ArrowDown":
        setSelectedIndex(Math.max(0, selectedIndex - 1));
        break;
      case "ArrowRight":
      case "ArrowUp":
        setSelectedIndex(Math.min(selectedIndex + 1, items.length - 1));
        break;
      case "PageDown":
        setSelectedIndex(Math.max(0, selectedIndex - Math.max(2, width)));
        break;
      case "PageUp":
        setSelectedIndex(Math.min(selectedIndex + Math.max(2, width), items.length - 1));
        break;
      case "Home":
        setSelectedIndex(0);
        break;
      case "End":
        setSelectedIndex(items.length - 1);
        break;
      default:
        return;
    }

    event.preventDefault();
  };

  return (
    <div className="feature-gallery-container">
      <div
        className="feature-gallery"
        style={{
          gridTemplateColumns: `${"1fr ".repeat(width)}`
        }}
      >
        {
          showIcons ?
            items
              .slice(range[0], range[1])
              .map((item, index) =>
                <button
                  aria-label={item.name || item.nftTemplateMetadata.display_name}
                  key={`feature-gallery-${item.itemIndex}`}
                  className={`feature-gallery__icon-container ${index === (selectedIndex - range[0]) ? "feature-gallery__icon-container--selected" : ""} ${item.nftTemplateMetadata.style ? `feature-gallery__icon-container--variant-${item.nftTemplateMetadata.style}` : ""}`}
                  onClick={() => setSelectedIndex(range[0] + index)}
                >
                  <div className="feature-gallery__icon">
                    <MarketplaceImage
                      marketplaceHash={marketplaceHash}
                      item={item}
                      url={item?.image?.url}
                    />
                  </div>
                </button>
              ) : null
        }
      </div>
      {
        items.length > width ?
          <div className="feature-gallery__slider">
            <div
              key={`handle-${snap}`}
              className="feature-gallery__slider-handle"
              role="slider"
              tabIndex="0"
              style={{
                width: `${Math.min(100, Math.max(0, 100 * width / items.length))}%`,
                left: `${Math.min(100, Math.max(0, 100 * range[0] / items.length))}%`
              }}
              onKeyDown={KeyboardControls}
              aria-label="Featured Item Gallery Slider"
              aria-valuemin={1}
              aria-valuenow={selectedIndex + 1}
              aria-valuemax={items.length}
            />
            <div
              className="feature-gallery__slider-drag"
              onMouseDown={event => {
                event.preventDefault();

                setDragging(true);

                const parent = event.target.parentElement;
                const HandleDrag = event => {
                  event.stopPropagation();
                  event.preventDefault();
                  event.cancelBubble = true;
                  event.returnValue = false;
                  const handle = parent.querySelector(".feature-gallery__slider-handle");
                  const parentBox = parent.getBoundingClientRect();
                  const handleBox = handle.getBoundingClientRect();
                  const handlePercentage = 100 * handleBox.width / parentBox.width;
                  const relativePosition = Math.min(100 - handlePercentage, Math.max(0, 100 * (event.clientX - parentBox.left - (handleBox.width / 2)) / parentBox.width));

                  handle.style.left = `${relativePosition}%`;

                  const newSelected = Math.round(items.length * (relativePosition / 100));
                  setRange([newSelected, newSelected + width]);
                };

                HandleDrag(event);

                document.body.style.cursor = "pointer!important";
                document.body.style.userSelect = "none!important";

                document.addEventListener("mousemove", HandleDrag);
                document.addEventListener("mouseup", () => {
                  document.body.style.cursor = "unset";
                  document.body.style.userSelect = "unset";
                  document.removeEventListener("mousemove", HandleDrag);
                  setSnap(snap + 1);
                  setDragging(false);
                });
              }}
            />
          </div> : null
      }
    </div>
  );
};

const MarketplaceFeatured = observer(({marketplaceHash, items, justification, countdown, showGallery}) => {
  const [featuredItemIndex, setFeaturedItemIndex] = useState(0);

  return (
    <div className="feature-container">
      <MarketplaceItemCard
        key={`featured-item-${featuredItemIndex}`}
        type="Featured"
        justification={justification}
        marketplaceHash={marketplaceHash}
        item={items[featuredItemIndex]}
        index={items[featuredItemIndex].itemIndex}
        showVideo={items[featuredItemIndex].play_on_storefront}
        countdown={countdown}
      />
      <FeaturedGallery
        showIcons={showGallery}
        marketplaceHash={marketplaceHash}
        items={items}
        selectedIndex={featuredItemIndex}
        setSelectedIndex={setFeaturedItemIndex}
      />
    </div>
  );
});

export default MarketplaceFeatured;
