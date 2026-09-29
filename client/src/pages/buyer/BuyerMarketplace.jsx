import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  Search,
  SlidersHorizontal,
  Grid2X2,
  Tag,
  Heart,
  ShoppingCart,
  MessageCircle,
  Eye,
  MapPin,
  Star,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  User,
  Package,
  RefreshCw,
  ShoppingBag,
  ShieldCheck,
  Recycle,
  Truck,
  Clock3,
  Send
} from 'lucide-react';

import {
  addToWishlist,
  removeFromWishlist,
  addToCart,
  getMarketplaceItems,
  getMarketplaceCategories,
  getWishlist,
  getCart
} from '../../services/buyer/buyerMarketplaceApi';

import {
  sendBuyerMessage
} from '../../services/buyer/buyerMessagesService';

import {
  createBuyerOrder
} from '../../services/buyer/buyerOrdersService';

import '../../styles/buyer/BuyerMarketplace.css';


// ============================================================
// AUTH HELPERS
// ============================================================

const getCurrentUser = () => {
  const keys = [
    'reuseconnect_user',
    'user',
    'currentUser',
    'authUser'
  ];

  for (const key of keys) {
    try {
      const stored =
        localStorage.getItem(key);

      if (!stored) {
        continue;
      }

      const parsed =
        JSON.parse(stored);

      if (parsed) {
        return parsed;
      }
    } catch (error) {
      console.warn(
        `Unable to read ${key}:`,
        error
      );
    }
  }

  return null;
};


const isBuyerLoggedIn = () => {
  const tokenKeys = [
    'reuseconnect_token',
    'token',
    'authToken',
    'accessToken'
  ];

  const hasToken =
    tokenKeys.some(
      (key) =>
        Boolean(
          localStorage.getItem(key)
        )
    );

  return (
    hasToken &&
    Boolean(getCurrentUser())
  );
};


// ============================================================
// IMAGE HELPER
// ============================================================

const getItemImage = (item) => {
  const rawImage =
    item?.primary_image ||
    item?.image_url ||
    (
      Array.isArray(item?.images)
        ? item.images[0]
        : null
    );

  if (!rawImage) {
    return '';
  }

  const value =
    String(rawImage).trim();

  if (!value) {
    return '';
  }

  if (
    value.startsWith('http://') ||
    value.startsWith('https://')
  ) {
    return value;
  }

  if (
    value.startsWith('data:') ||
    value.startsWith('blob:')
  ) {
    return value;
  }

  if (
    value.startsWith('/api/')
  ) {
    return (
      `http://localhost:5000${value}`
    );
  }

  if (
    value.startsWith('/uploads/')
  ) {
    const filename =
      value
        .split('/')
        .filter(Boolean)
        .pop();

    if (!filename) {
      return '';
    }

    return (
      'http://localhost:5000' +
      '/api/seller/listings/image/' +
      encodeURIComponent(filename)
    );
  }

  return value;
};


// ============================================================
// GENERAL HELPERS
// ============================================================

const formatPrice = (value) => {
  const number =
    Number(value || 0);

  return new Intl.NumberFormat(
    'en-PH',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  ).format(number);
};


const peso = (value) => {
  const number =
    Number(value || 0);

  return new Intl.NumberFormat(
    'en-PH',
    {
      style: 'currency',
      currency: 'PHP',
      maximumFractionDigits: 0
    }
  ).format(number);
};


const getItemId = (item) => {
  return (
    item?.listing_id ||
    item?.id ||
    item?.product_id ||
    item?.productId ||
    null
  );
};


const getSellerId = (item) => {
  return (
    item?.seller_id ||
    item?.sellerId ||
    item?.seller?.user_id ||
    item?.seller?.id ||
    null
  );
};


const getItemName = (item) => {
  return (
    item?.title ||
    item?.name ||
    item?.product_name ||
    'Untitled Item'
  );
};


const getCategoryName = (item) => {
  const category =
    item?.category_name ??
    item?.category ??
    item?.categoryName;

  if (
    typeof category === 'string' ||
    typeof category === 'number'
  ) {
    return String(category);
  }

  if (
    category &&
    typeof category === 'object'
  ) {
    return (
      category.name ||
      category.category_name ||
      category.title ||
      'Uncategorized'
    );
  }

  return 'Uncategorized';
};


const getCondition = (item) => {
  return (
    item?.condition ||
    item?.item_condition ||
    'Good'
  );
};


const getLocation = (item) => {
  return (
    item?.location ||
    item?.seller_location ||
    item?.address ||
    'Philippines'
  );
};


const getRating = (item) => {
  const value =
    item?.rating ??
    item?.average_rating ??
    item?.review_rating ??
    0;

  return Number(value || 0);
};


const getReviewCount = (item) => {
  return Number(
    item?.review_count ??
    item?.reviews_count ??
    item?.total_reviews ??
    0
  );
};


// ============================================================
// LISTING TYPE
// ============================================================

const getItemType = (item) => {
  const rawType =
    item?.listing_type ||
    item?.item_type ||
    item?.type ||
    '';

  const type =
    String(rawType).toLowerCase();

  if (
    type.includes('donat')
  ) {
    return 'donated';
  }

  if (
    type.includes('trade')
  ) {
    return 'trade';
  }

  return 'sale';
};


// ============================================================
// STATUS
// ============================================================

const getRawStatus = (item) => {
  return String(
    item?.status || ''
  )
    .trim()
    .toUpperCase();
};


const isQuantityAvailable = (item) => {
  return (
    Number(item?.quantity ?? 0) > 0
  );
};


const canBuyNow = (item) => {
  const type =
    getItemType(item);

  const status =
    getRawStatus(item);

  const quantity =
    Number(item?.quantity ?? 0);

  const sizeInventory =
    Array.isArray(item?.size_inventory)
      ? item.size_inventory
      : [];

  const sizeStock =
    sizeInventory.reduce(
      (total, entry) =>
        total +
        Math.max(
          0,
          Number(
            entry?.quantity ??
            entry?.stock ??
            0
          )
        ),
      0
    );

  const hasSizeInventory =
    sizeInventory.length > 0;

  const hasStock =
    hasSizeInventory
      ? sizeStock > 0
      : quantity > 0;

  return (
    (
      type === 'sale' ||
      type === 'donated'
    ) &&
    status === 'AVAILABLE' &&
    hasStock
  );
};


const getStatusLabel = (item) => {
  const type =
    getItemType(item);

  const status =
    getRawStatus(item);

  const quantity =
    Number(item?.quantity ?? 0);

  if (
    status === 'SOLD' ||
    quantity <= 0
  ) {
    return 'Sold';
  }

  if (
    status === 'RESERVED'
  ) {
    return 'Reserved';
  }

  if (
    status === 'HIDDEN'
  ) {
    return 'Unavailable';
  }

  if (
    status === 'REJECTED'
  ) {
    return 'Unavailable';
  }

  if (
    status === 'PENDING'
  ) {
    return 'Pending';
  }

  if (
    status === 'PROCESSING'
  ) {
    return 'Processing';
  }

  if (
    type === 'donated'
  ) {
    return 'Donation';
  }

  if (
    type === 'trade'
  ) {
    return 'For Trade';
  }

  if (
    status === 'AVAILABLE'
  ) {
    return 'Available';
  }

  return 'Unavailable';
};


const getStatusClass = (item) => {
  const status =
    getRawStatus(item);

  const quantity =
    Number(item?.quantity ?? 0);

  if (
    status === 'SOLD' ||
    quantity <= 0
  ) {
    return 'sold';
  }

  if (
    status === 'RESERVED'
  ) {
    return 'reserved';
  }

  if (
    status === 'PENDING' ||
    status === 'PROCESSING'
  ) {
    return 'pending';
  }

  if (
    status === 'AVAILABLE'
  ) {
    return '';
  }

  return 'unavailable';
};


// ============================================================
// IMAGE FALLBACK
// ============================================================

const handleImageError = (event) => {
  event.currentTarget.style.display =
    'none';
};


// ============================================================
// MARKETPLACE CARD
// ============================================================

const MarketplaceCard = ({
  item,
  onWishlist,
  onCart,
  onBuyNow,
  onView,
  onMessage,
  wishlistLoading,
  cartLoading,
  buyNowLoading
}) => {

  const itemId =
    getItemId(item);

  const image =
    getItemImage(item);

  const name =
    getItemName(item);

  const category =
    getCategoryName(item);

  const condition =
    getCondition(item);

  const location =
    getLocation(item);

  const rating =
    getRating(item);

  const reviewCount =
    getReviewCount(item);

  const type =
    getItemType(item);

  const statusLabel =
    getStatusLabel(item);

  const statusClass =
    getStatusClass(item);

  const available =
    canBuyNow(item);

  const wishlisted =
    Boolean(
      item?.is_favorited ||
      item?.is_wishlisted ||
      item?.isFavorite
    );

  const inCart =
    Boolean(
      item?.in_cart ||
      item?.inCart
    );

  return (
    <article
      className="marketplace-product-card"
    >

      {/* ==================================================
          IMAGE
      ================================================== */}

      <div
        className="product-image-container"
      >

        {image ? (
          <img
            src={image}
            alt={name}
            className="product-image"
            onError={handleImageError}
          />
        ) : (
          <div
            className="marketplace-no-image"
          >
            <Package size={38} />

            <span>
              No image
            </span>
          </div>
        )}


        {/* STATUS */}

        <span
          className={`product-status ${statusClass} ${
            type === 'donated'
              ? 'donated'
              : type === 'trade'
                ? 'trade'
                : ''
          }`}
        >
          {statusLabel}
        </span>


        {/* WISHLIST */}

        <button
          type="button"
          className={
            wishlisted
              ? 'product-wishlist active'
              : 'product-wishlist'
          }
          title={
            wishlisted
              ? 'Remove from wishlist'
              : 'Add to wishlist'
          }
          aria-label={
            wishlisted
              ? 'Remove from wishlist'
              : 'Add to wishlist'
          }
          onClick={() =>
            onWishlist(item)
          }
          disabled={
            wishlistLoading === itemId
          }
        >
          {wishlistLoading === itemId ? (
            <RefreshCw
              size={15}
              className="marketplace-spin"
            />
          ) : (
            <Heart
              size={17}
              fill={
                wishlisted
                  ? 'currentColor'
                  : 'none'
              }
            />
          )}
        </button>

      </div>


      {/* ==================================================
          BODY
      ================================================== */}

      <div
        className="product-card-body"
      >

        <h3
          className="product-name"
          title={name}
        >
          {name}
        </h3>


        <span
          className="product-category"
        >
          {category}
        </span>


        <span
          className="product-condition"
        >
          {condition}
        </span>


        <strong
          className={`product-price ${
            type === 'trade'
              ? 'trade-price'
              : type === 'donated'
                ? 'donated-price'
                : ''
          }`}
        >
          {type === 'sale'
            ? `₱${formatPrice(item?.price)}`
            : type === 'donated'
              ? '₱0.00'
              : 'For Trade'}
        </strong>


        <div
          className="product-location"
        >
          <MapPin size={11} />

          <span>
            {location}
          </span>
        </div>


        <div
          className="product-rating"
        >
          <Star
            size={11}
            fill="currentColor"
          />

          <span>
            {rating > 0
              ? rating.toFixed(1)
              : 'No rating'}
          </span>

          {reviewCount > 0 && (
            <span>
              ({reviewCount})
            </span>
          )}
        </div>


        {/* ==================================================
            ACTIONS
        ================================================== */}

        <div
          className="product-actions"
        >

          {/* MESSAGE */}

          <button
            type="button"
            className="product-icon-button"
            title="Message seller"
            aria-label="Message seller"
            onClick={() =>
              onMessage(item)
            }
          >
            <MessageCircle
              size={16}
            />
          </button>


          {/* CART */}

          <button
            type="button"
            className={
              inCart
                ? 'product-icon-button active'
                : 'product-icon-button'
            }
            title={
              inCart
                ? 'Already in cart'
                : 'Add to cart'
            }
            aria-label={
              inCart
                ? 'Already in cart'
                : 'Add to cart'
            }
            onClick={() =>
              onCart(item)
            }
            disabled={
              !(
                type === 'sale' ||
                type === 'donated'
              ) ||
              !available ||
              cartLoading === itemId
            }
          >
            {cartLoading === itemId ? (
              <RefreshCw
                size={16}
                className="marketplace-spin"
              />
            ) : (
              <ShoppingCart
                size={16}
              />
            )}
          </button>


          {/* VIEW DETAILS - ICON ONLY */}

          <button
            type="button"
            className="view-details-button"
            title="View details"
            aria-label="View details"
            onClick={() =>
              onView(item)
            }
          >
            <Eye size={16} />
          </button>


          {/* BUY NOW */}

          <button
            type="button"
            className="marketplace-buy-now-btn"
            title={
              available
                ? 'Buy now'
                : statusLabel
            }
            onClick={() =>
              onBuyNow(item)
            }
            disabled={
              !available ||
              buyNowLoading === itemId
            }
          >
            {buyNowLoading === itemId ? (
              <RefreshCw
                size={15}
                className="marketplace-spin"
              />
            ) : (
              <ShoppingBag
                size={15}
              />
            )}

            <span>
              Buy Now
            </span>
          </button>

        </div>

      </div>

    </article>
  );
};


// ============================================================
// ITEM DETAILS MODAL
// ============================================================

function MarketplaceItemModal({
  item,
  onClose,
  onWishlist,
  onCart,
  onBuyNow,
  onMessage,
  wishlistLoading,
  cartLoading,
  buyNowLoading
}) {

  const type =
    getItemType(item);

  const itemId =
    getItemId(item);

  const price =
    item?.price ??
    item?.selling_price ??
    item?.amount ??
    0;

  const image =
    getItemImage(item);

  const available =
    canBuyNow(item);

  const statusLabel =
    getStatusLabel(item);

  const statusClass =
    getStatusClass(item);

  const sellerName =
    item?.seller?.name ||
    item?.seller_name ||
    (
      [
        item?.seller?.first_name,
        item?.seller?.last_name
      ]
        .filter(Boolean)
        .join(' ')
    ) ||
    'Seller';

  return (
    <div
      className="marketplace-modal-overlay"
      onMouseDown={(event) => {

        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }

      }}
    >

      <div
        className="marketplace-modal"
      >

        {/* CLOSE */}

        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          title="Close"
          aria-label="Close"
        >
          <X size={20} />
        </button>


        {/* IMAGE */}

        <div
          className="modal-image"
        >

          {image ? (
            <img
              src={image}
              alt={getItemName(item)}
              onError={handleImageError}
            />
          ) : (
            <div
              className="marketplace-no-image"
            >
              <Package size={48} />

              <span>
                No image
              </span>
            </div>
          )}

        </div>


        {/* CONTENT */}

        <div
          className="modal-content"
        >

          {/* STATUS */}

          <span
            className={`modal-status ${statusClass} ${type}`}
          >
            {statusLabel}
          </span>


          {/* TITLE */}

          <h2>
            {getItemName(item)}
          </h2>


          {/* CATEGORY */}

          <div
            className="modal-category"
          >
            {getCategoryName(item)}
          </div>


          {/* PRICE */}

          {type === 'trade' ? (
            <div
              className="modal-price"
            >
              Trade Only
            </div>
          ) : type === 'donated' ? (
            <div
              className="modal-price donated-price"
            >
              ₱0.00
            </div>
          ) : (
            <div
              className="modal-price"
            >
              {peso(price)}
            </div>
          )}


          {/* INFORMATION */}

          <div
            className="modal-information"
          >

            <div>
              <span>
                Condition
              </span>

              <strong>
                {getCondition(item)}
              </strong>
            </div>


            <div>
              <span>
                Location
              </span>

              <strong>
                <MapPin size={12} />

                {getLocation(item)}
              </strong>
            </div>


            <div>
              <span>
                Rating
              </span>

              <strong>
                <Star
                  size={12}
                  fill="currentColor"
                />

                {getRating(item) > 0
                  ? getRating(item).toFixed(1)
                  : 'No rating'}
              </strong>
            </div>


            <div>
              <span>
                Available
              </span>

              <strong>
                {Number(
                  item?.quantity ?? 0
                )}
              </strong>
            </div>

          </div>


          {/* DESCRIPTION */}

          <div
            className="modal-description"
          >

            <h3>
              Description
            </h3>

            <p>
              {item?.description ||
                'No description provided.'}
            </p>

          </div>


          {/* SELLER */}

          <div
            className="modal-seller"
          >

            <div
              className="seller-avatar"
            >
              <User size={17} />
            </div>

            <div>
              <span>
                Seller
              </span>

              <strong>
                {sellerName}
              </strong>
            </div>

          </div>


          {/* ==================================================
              MODAL ACTIONS
          ================================================== */}

          <div
            className="modal-actions"
          >

            {/* WISHLIST */}

            <button
              type="button"
              className="modal-wishlist"
              onClick={() =>
                onWishlist(item)
              }
              disabled={
                wishlistLoading
              }
            >

              {wishlistLoading ? (
                <RefreshCw
                  size={15}
                  className="marketplace-spin"
                />
              ) : (
                <Heart
                  size={15}
                  fill={
                    item?.is_favorited
                      ? 'currentColor'
                      : 'none'
                  }
                />
              )}

              {item?.is_favorited
                ? 'Wishlisted'
                : 'Wishlist'}

            </button>


            {/* CART */}

            <button
              type="button"
              className="modal-cart"
              onClick={() =>
                onCart(item)
              }
              disabled={
                !(
                  type === 'sale' ||
                  type === 'donated'
                ) ||
                !available ||
                cartLoading
              }
            >

              {cartLoading ? (
                <RefreshCw
                  size={15}
                  className="marketplace-spin"
                />
              ) : (
                <ShoppingCart
                  size={15}
                />
              )}

              {item?.in_cart
                ? 'In Cart'
                : 'Add to Cart'}

            </button>


            {/* BUY NOW */}

            <button
              type="button"
              className="marketplace-modal-buy-btn"
              onClick={() => {
                onBuyNow(item);
                onClose(); // Close details modal to show buy now modal cleanly
              }}
              disabled={
                !available ||
                buyNowLoading === itemId
              }
            >

              {buyNowLoading === itemId ? (
                <RefreshCw
                  size={15}
                  className="marketplace-spin"
                />
              ) : (
                <ShoppingBag
                  size={15}
                />
              )}

              Buy Now

            </button>


            {/* MESSAGE - ICON ONLY CONSISTENT DESIGN */}
            <button
              type="button"
              className="modal-message-btn"
              onClick={() => {
                onMessage(item);
                onClose(); // Close details modal to show message modal cleanly
              }}
              title="Message Seller"
              aria-label="Message Seller"
            >
              <MessageCircle size={16} />
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}


// ============================================================
// SIZE HELPERS
// ============================================================

const getSizeOptions = (item) => {
  const raw = item?.size_options ?? item?.size_inventory ?? item?.sizes ?? item?.available_sizes ?? item?.sizeOptions ?? item?.size ?? [];
  if (Array.isArray(raw)) {
    return raw.map((size) => size && typeof size === 'object'
      ? { value: String(size.label || size.name || size.size || size.value || '').trim(), quantity: Math.max(0, Number(size.quantity ?? size.stock ?? 0)) }
      : { value: String(size || '').trim(), quantity: Number(item?.quantity || 0) }
    ).filter((size) => size.value);
  }
  return String(raw || '').split(',').map((size) => ({ value: size.trim(), quantity: Number(item?.quantity || 0) })).filter((size) => size.value);
};


// ============================================================
// BUY NOW MODAL FORM (WITH RADIO BUTTONS & CONDITIONAL FIELDS)
// ============================================================

function BuyNowModal({
  item,
  onClose,
  onConfirm,
  loading
}) {
  const [quantity, setQuantity] = useState(1);
  
    const [selectedSize, setSelectedSize] = useState('');
// Shipping State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');

  const sizeOptions = getSizeOptions(item);
  const selectedSizeOption = sizeOptions.find((option) => option.value === selectedSize);

  useEffect(() => {
    setSelectedSize('');
    setQuantity(1);
  }, [item?.listing_id, item?.id]);

  useEffect(() => {
    if (selectedSizeOption && selectedSizeOption.quantity > 0 && quantity > selectedSizeOption.quantity) {
      setQuantity(selectedSizeOption.quantity);
    }
  }, [selectedSize, selectedSizeOption?.quantity]);

  if (!item) return null;

  const maxQuantity = selectedSizeOption ? Math.max(0, Number(selectedSizeOption.quantity || 0)) : Number(item?.quantity || 1);

  const price = Number(
    item?.listing_type &&
    String(item.listing_type).toLowerCase().includes('donat')
      ? 0
      : (item?.price || item?.selling_price || 0)
  );
  const total = price * quantity;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!fullName || !phone || !address || !city || !zipCode) {
      alert("Please fill in all shipping details.");
      return;
    }

    if (sizeOptions.length > 0 && !selectedSize) {
      alert("Please select a size.");
      return;
    }

    if (maxQuantity <= 0) {
      alert('The selected size is out of stock.');
      return;
    }

    if ((paymentMethod === 'GCash' || paymentMethod === 'PayMaya') && (!accountName || !accountNumber)) {
      alert("Please fill in your account name and number.");
      return;
    }

    if (paymentMethod === 'Bank Transfer' && (!bankName || !accountName || !accountNumber)) {
      alert("Please fill in the bank name, account name, and account number.");
      return;
    }

    onConfirm({
      quantity,
      size: selectedSize || null,
      shipping: { fullName, phone, address, city, zipCode },
      payment: { method: paymentMethod, accountName, accountNumber, bankName },
      total
    });
  };

  return (
    <div
      className="marketplace-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div className="marketplace-modal buy-now-modal">
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          disabled={loading}
          title="Close"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="modal-content" style={{ padding: '30px 25px' }}>
          <h2 style={{ margin: '0 0 20px', color: '#302275', fontSize: '22px' }}>
            Confirm Purchase
          </h2>

          {/* PRODUCT PREVIEW */}
          <div className="buy-form-product">
            <div className="buy-form-image">
              {getItemImage(item) ? (
                <img src={getItemImage(item)} alt={getItemName(item)} />
              ) : (
                <Package size={24} />
              )}
            </div>
            <div>
              <strong>{getItemName(item)}</strong>
              <span>
                {getItemType(item) === 'donated'
                  ? '₱0.00'
                  : peso(price)}
              </span>
              <small>Available: {maxQuantity}</small>
            </div>
          </div>

          <form className="marketplace-buy-form" onSubmit={handleSubmit}>
            
            {/* QUANTITY */}
            <div className="marketplace-form-field">
              <span className="marketplace-form-label">
                Quantity
              </span>

              <div className="marketplace-quantity-control">
                <button
                  type="button"
                  className="marketplace-quantity-button"
                  onClick={() =>
                    setQuantity((previous) =>
                      Math.max(1, previous - 1)
                    )
                  }
                  disabled={loading || quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  −
                </button>

                <input
                  type="number"
                  min="1"
                  max={maxQuantity}
                  value={quantity}
                  onChange={(e) => {
                    let value = Number(e.target.value);

                    if (!Number.isFinite(value) || value < 1) {
                      value = 1;
                    }

                    if (value > maxQuantity) {
                      value = maxQuantity;
                    }

                    setQuantity(Math.floor(value));
                  }}
                  disabled={loading}
                  aria-label="Quantity"
                />

                <button
                  type="button"
                  className="marketplace-quantity-button"
                  onClick={() =>
                    setQuantity((previous) =>
                      Math.min(maxQuantity, previous + 1)
                    )
                  }
                  disabled={
                    loading ||
                    quantity >= maxQuantity
                  }
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            {/* SIZE */}
            {sizeOptions.length > 0 && (
              <div className="marketplace-form-field">
                <span className="marketplace-form-label">Size</span>
                <div className="size-options" role="group" aria-label="Select size">
                  {sizeOptions.map((size) => {
                    const stock = Math.max(0, Number(size.quantity || 0));
                    const unavailable = stock <= 0;
                    return (
                      <button key={size.value} type="button" className={selectedSize === size.value ? 'size-option active' : 'size-option'} onClick={() => setSelectedSize(size.value)} disabled={loading || unavailable} title={unavailable ? 'Out of stock' : `${stock} available`}>
                        <span>{size.value}</span>
                        <small>{unavailable ? 'Out of stock' : `${stock} left`}</small>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SHIPPING DETAILS SECTION */}
            <div style={{ marginTop: '10px', borderTop: '1px solid #eeeaf6', paddingTop: '15px' }}>
              <h3 style={{ margin: '0 0 10px', color: '#382982', fontSize: '12px' }}>Shipping Details</h3>
              
              <div className="shipping-grid">
                <label>
                  <span>Full Name</span>
                  <input
                    type="text"
                    placeholder="Juan Dela Cruz"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={loading}
                    required
                  />
                </label>

                <label>
                  <span>Phone Number</span>
                  <input
                    type="text"
                    placeholder="09123456789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                    required
                  />
                </label>

                <label style={{ gridColumn: 'span 2' }}>
                  <span>Complete Address</span>
                  <input
                    type="text"
                    placeholder="House No., Street, Barangay"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={loading}
                    required
                  />
                </label>

                <label>
                  <span>City / Municipality</span>
                  <input
                    type="text"
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={loading}
                    required
                  />
                </label>

                <label>
                  <span>Zip Code</span>
                  <input
                    type="text"
                    placeholder="1000"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    disabled={loading}
                    required
                  />
                </label>
              </div>
            </div>

            {/* PAYMENT METHOD SECTION */}
            <div style={{ marginTop: '10px', borderTop: '1px solid #eeeaf6', paddingTop: '15px' }}>
              <h3 style={{ margin: '0 0 10px', color: '#382982', fontSize: '12px' }}>Payment Method</h3>
              
              <div className="payment-method-options">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="COD"
                    checked={paymentMethod === 'COD'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    disabled={loading}
                  />
                  Cash on Delivery (COD)
                </label>

                <label className="radio-label">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="GCash"
                    checked={paymentMethod === 'GCash'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    disabled={loading}
                  />
                  GCash
                </label>

                <label className="radio-label">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="PayMaya"
                    checked={paymentMethod === 'PayMaya'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    disabled={loading}
                  />
                  PayMaya
                </label>

                <label className="radio-label">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="Bank Transfer"
                    checked={paymentMethod === 'Bank Transfer'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    disabled={loading}
                  />
                  Bank Transfer
                </label>
              </div>

              {/* CONDITIONAL FIELDS FOR GCASH / PAYMAYA */}
              {(paymentMethod === 'GCash' || paymentMethod === 'PayMaya') && (
                <div className="payment-details-form">
                  <label>
                    <span>Account Name</span>
                    <input
                      type="text"
                      placeholder="Juan Dela Cruz"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </label>
                  <label>
                    <span>Account Number</span>
                    <input
                      type="text"
                      placeholder="09123456789"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </label>
                </div>
              )}

              {/* CONDITIONAL FIELDS FOR BANK TRANSFER */}
              {paymentMethod === 'Bank Transfer' && (
                <div className="payment-details-form">
                  <label style={{ gridColumn: 'span 2' }}>
                    <span>Bank Name</span>
                    <input
                      type="text"
                      placeholder="BDO, BPI, Metrobank, etc."
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </label>
                  <label>
                    <span>Account Name</span>
                    <input
                      type="text"
                      placeholder="Juan Dela Cruz"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </label>
                  <label>
                    <span>Account Number</span>
                    <input
                      type="text"
                      placeholder="1234567890"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </label>
                </div>
              )}
            </div>

            {/* TOTAL */}
            <div className="buy-form-total">
              <span>Total Amount</span>
              <strong>{peso(total)}</strong>
            </div>

            {/* ACTIONS */}
            <div className="marketplace-form-modal-actions">
              <button
                type="button"
                className="marketplace-modal-cancel"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="marketplace-modal-confirm"
                disabled={loading}
              >
                {loading ? (
                  <RefreshCw size={15} className="marketplace-spin" />
                ) : (
                  <ShoppingBag size={15} />
                )}
                Place Order
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


// ============================================================
// MESSAGE MODAL
// ============================================================

function BuyerMessageModal({
  item,
  messageText,
  setMessageText,
  sending,
  onClose,
  onSend
}) {

  if (!item) {
    return null;
  }

  const sellerName =
    item?.seller?.name ||
    item?.seller_name ||
    (
      [
        item?.seller?.first_name,
        item?.seller?.last_name
      ]
        .filter(Boolean)
        .join(' ')
    ) ||
    'Seller';

  return (
    <div
      className="marketplace-modal-overlay"
      onMouseDown={(event) => {

        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }

      }}
    >

      <div
        className="marketplace-modal message-modal"
      >

        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          title="Close"
          aria-label="Close"
        >
          <X size={20} />
        </button>


        <div
          className="modal-content"
          style={{
            gridColumn: '1 / -1'
          }}
        >

          <div
            className="modal-seller"
            style={{
              marginTop: 0
            }}
          >

            <div
              className="seller-avatar"
            >
              <MessageCircle
                size={18}
              />
            </div>

            <div>

              <span>
                Message seller
              </span>

              <strong>
                {sellerName}
              </strong>

            </div>

          </div>


          <div
            style={{
              marginTop: '18px',
              padding: '12px',
              border: '1px solid #e9e5f5',
              borderRadius: '9px',
              background: '#faf9ff'
            }}
          >

            <strong
              style={{
                display: 'block',
                color: '#382982',
                fontSize: '11px',
                marginBottom: '4px'
              }}
            >
              {getItemName(item)}
            </strong>

            <span
              style={{
                color: '#8882ac',
                fontSize: '9px'
              }}
            >
              {getCategoryName(item)}
            </span>

          </div>


          <div
            style={{
              marginTop: '15px'
            }}
          >

            <textarea
              value={messageText}
              onChange={(event) =>
                setMessageText(
                  event.target.value
                )
              }
              placeholder="Write your message to the seller..."
              rows={5}
              maxLength={1000}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                resize: 'vertical',
                border: '1px solid #e4e0f5',
                borderRadius: '9px',
                padding: '12px',
                outline: 'none',
                fontFamily: 'inherit',
                fontSize: '11px',
                color: '#30247a',
                background: '#ffffff'
              }}
            />

            <div
              style={{
                marginTop: '5px',
                textAlign: 'right',
                color: '#9893c0',
                fontSize: '9px'
              }}
            >
              {messageText.length}/1000
            </div>

          </div>


          <div
            className="modal-actions"
            style={{
              justifyContent: 'flex-end'
            }}
          >

            <button
              type="button"
              className="modal-wishlist"
              onClick={onClose}
              disabled={sending}
            >
              Cancel
            </button>


            <button
              type="button"
              className="marketplace-modal-buy-btn"
              onClick={onSend}
              disabled={
                sending ||
                !messageText.trim()
              }
            >

              {sending ? (
                <RefreshCw
                  size={15}
                  className="marketplace-spin"
                />
              ) : (
                <Send size={15} />
              )}

              Send Message

            </button>

          </div>

        </div>

      </div>

    </div>
  );
}


// ============================================================
// MAIN MARKETPLACE
// ============================================================

const BuyerMarketplace = () => {

  const [
    items,
    setItems
  ] = useState([]);

  const [
    categories,
    setCategories
  ] = useState([]);

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    error,
    setError
  ] = useState('');

  const [
    search,
    setSearch
  ] = useState('');

  const [
    category,
    setCategory
  ] = useState('all');

  const [
    priceRange,
    setPriceRange
  ] = useState('all');

  const [
    condition,
    setCondition
  ] = useState('all');

  const [
    sortBy,
    setSortBy
  ] = useState('newest');

  const [
    activeTab,
    setActiveTab
  ] = useState('all');

  const [
    viewMode,
    setViewMode
  ] = useState('grid');

  const [
    page,
    setPage
  ] = useState(1);

  const [
    totalItems,
    setTotalItems
  ] = useState(0);

  const [
    totalReused,
    setTotalReused
  ] = useState(0);

  const [
    selectedItem,
    setSelectedItem
  ] = useState(null);

  const [
    messageItem,
    setMessageItem
  ] = useState(null);

  const [
    messageText,
    setMessageText
  ] = useState('');

  const [
    sendingMessage,
    setSendingMessage
  ] = useState(false);

  const [
    wishlistLoading,
    setWishlistLoading
  ] = useState(null);

  const [
    cartLoading,
    setCartLoading
  ] = useState(null);

  const [
    buyNowLoading,
    setBuyNowLoading
  ] = useState(null);

  const [
    buyNowItem,
    setBuyNowItem
  ] = useState(null);

  const [
    message,
    setMessage
  ] = useState('');

  const [
    refreshing,
    setRefreshing
  ] = useState(false);

  const [
    filtersOpen,
    setFiltersOpen
  ] = useState(false);

  const [
    wishlistIds,
    setWishlistIds
  ] = useState(
    new Set()
  );

  const [
    cartIds,
    setCartIds
  ] = useState(
    new Set()
  );


  const LIMIT = 8;


  // ==========================================================
  // LOAD CATEGORIES
  // ==========================================================

  const loadCategories =
    useCallback(
      async () => {

        try {

          const response =
            await getMarketplaceCategories();

          const categoryData =
            response?.categories ||
            response?.data?.categories ||
            response?.data ||
            [];

          if (
            Array.isArray(categoryData)
          ) {
            setCategories(
              categoryData
            );
          }

        } catch (requestError) {

          console.error(
            'Marketplace categories error:',
            requestError
          );

        }

      },
      []
    );


  // ==========================================================
  // LOAD WISHLIST
  // ==========================================================

  const loadWishlist =
    useCallback(
      async () => {

        if (
          !isBuyerLoggedIn()
        ) {
          setWishlistIds(
            new Set()
          );

          return;
        }

        try {

          const response =
            await getWishlist();

          const wishlist =
            response?.favorites ||
            response?.wishlist ||
            response?.data?.favorites ||
            response?.data?.wishlist ||
            response?.data ||
            [];

          if (
            !Array.isArray(wishlist)
          ) {
            return;
          }

          setWishlistIds(
            new Set(
              wishlist
                .map(
                  (item) =>
                    getItemId(
                      item?.listing ||
                      item
                    )
                )
                .filter(Boolean)
            )
          );

        } catch (requestError) {

          console.warn(
            'Unable to load wishlist:',
            requestError
          );

        }

      },
      []
    );


  // ==========================================================
  // LOAD CART
  // ==========================================================

  const loadCart =
    useCallback(
      async () => {

        if (
          !isBuyerLoggedIn()
        ) {
          setCartIds(
            new Set()
          );

          return;
        }

        try {

          const response =
            await getCart();

          const cart =
            response?.items ||
            response?.cart ||
            response?.data?.items ||
            response?.data?.cart ||
            response?.data ||
            [];

          if (
            !Array.isArray(cart)
          ) {
            return;
          }

          const ids =
            cart
              .map(
                (item) =>
                  getItemId(
                    item?.listing ||
                    item
                  )
              )
              .filter(Boolean);

          setCartIds(
            new Set(ids)
          );

          /*
          Notify BuyerHeader so the cart badge
          can update when it listens for this event.
          */

          window.dispatchEvent(
            new CustomEvent(
              'buyer-cart-updated',
              {
                detail: {
                  count: ids.length
                }
              }
            )
          );

        } catch (requestError) {

          console.warn(
            'Unable to load cart:',
            requestError
          );

        }

      },
      []
    );


  // ==========================================================
  // LOAD MARKETPLACE
  // ==========================================================

  const loadMarketplace =
    useCallback(
      async (
        showRefresh = false
      ) => {

        try {

          if (
            showRefresh
          ) {
            setRefreshing(
              true
            );
          } else {
            setLoading(
              true
            );
          }

          setError('');

          const response =
            await getMarketplaceItems(
              {
                type: 'sale',

                search:
                  search.trim(),

                category:
                  category === 'all'
                    ? ''
                    : category,

                priceRange:
                  priceRange === 'all'
                    ? ''
                    : priceRange,

                condition:
                  condition === 'all'
                    ? ''
                    : condition,

                sortBy,

                page,

                limit: LIMIT
              }
            );

          const marketplaceItems =
            response?.items ||
            response?.listings ||
            response?.products ||
            response?.data?.items ||
            response?.data?.listings ||
            response?.data?.products ||
            response?.data ||
            [];

          const total =
            Number(
              response?.total ??
              response?.totalItems ??
              response?.pagination?.total ??
              response?.data?.total ??
              marketplaceItems.length
            );

          const reused =
            Number(
              response?.total_reused ??
              response?.totalReused ??
              response?.reused_count ??
              response?.data?.total_reused ??
              response?.data?.totalReused ??
              0
            );

          if (
            Array.isArray(
              marketplaceItems
            )
          ) {

            setItems(
              marketplaceItems.map(
                (item) => {

                  const itemId =
                    getItemId(item);

                  return {
                    ...item,

                    is_favorited:
                      wishlistIds.has(
                        itemId
                      ) ||
                      Boolean(
                        item?.is_favorited ??
                        item?.isFavorite ??
                        item?.favorite
                      ),

                    in_cart:
                      cartIds.has(
                        itemId
                      ) ||
                      Boolean(
                        item?.in_cart ??
                        item?.inCart
                      )
                  };

                }
              )
            );

            setTotalItems(
              total
            );

            setTotalReused(
              reused
            );

          } else {

            setItems([]);

            setTotalItems(
              0
            );

            setTotalReused(
              0
            );

          }

        } catch (requestError) {

          console.error(
            'Marketplace loading error:',
            requestError
          );

          setError(
            requestError?.message ||
            'Unable to load marketplace items.'
          );

        } finally {

          setLoading(false);

          setRefreshing(
            false
          );

        }

      },
      [
        activeTab,
        search,
        category,
        priceRange,
        condition,
        sortBy,
        page,
        wishlistIds,
        cartIds
      ]
    );


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {

    loadCategories();

    loadWishlist();

    loadCart();

  }, [
    loadCategories,
    loadWishlist,
    loadCart
  ]);


  // ==========================================================
  // MARKETPLACE LOAD
  // ==========================================================

  useEffect(() => {

    loadMarketplace();

  }, [
    loadMarketplace
  ]);


  // ==========================================================
  // TOAST TIMER
  // ==========================================================

  useEffect(() => {

    if (!message) {
      return undefined;
    }

    const timer =
      setTimeout(
        () =>
          setMessage(''),
        3000
      );

    return () =>
      clearTimeout(timer);

  }, [
    message
  ]);


  // ==========================================================
  // UPDATE ITEM FLAG
  // ==========================================================

  const updateItemFlag = (
    itemId,
    key,
    value
  ) => {

    setItems(
      (current) =>
        current.map(
          (item) =>
            String(
              getItemId(item)
            ) ===
            String(itemId)
              ? {
                  ...item,
                  [key]: value
                }
              : item
        )
    );

    setSelectedItem(
      (current) => {

        if (
          !current ||
          String(
            getItemId(current)
          ) !==
          String(itemId)
        ) {
          return current;
        }

        return {
          ...current,
          [key]: value
        };

      }
    );

  };


  // ==========================================================
  // WISHLIST
  // ==========================================================

  const handleWishlist =
    async (item) => {

      const itemId =
        getItemId(item);

      if (!itemId) {

        setMessage(
          'Unable to identify this item.'
        );

        return;
      }

      if (
        !isBuyerLoggedIn()
      ) {

        window.location.href =
          '/login';

        return;
      }

      const currentlyWishlisted =
        wishlistIds.has(
          itemId
        ) ||
        Boolean(
          item?.is_favorited
        );

      try {

        setWishlistLoading(
          itemId
        );

        if (
          currentlyWishlisted
        ) {

          await removeFromWishlist(
            itemId
          );

          setWishlistIds(
            (current) => {

              const next =
                new Set(
                  current
                );

              next.delete(
                itemId
              );

              return next;
            }
          );

          updateItemFlag(
            itemId,
            'is_favorited',
            false
          );

          setMessage(
            'Removed from wishlist.'
          );

        } else {

          await addToWishlist(
            itemId
          );

          setWishlistIds(
            (current) => {

              const next =
                new Set(
                  current
                );

              next.add(
                itemId
              );

              return next;
            }
          );

          updateItemFlag(
            itemId,
            'is_favorited',
            true
          );

          setMessage(
            'Added to wishlist.'
          );

        }

      } catch (requestError) {

        console.error(
          'Wishlist error:',
          requestError
        );

        if (
          requestError?.status === 401 ||
          requestError?.statusCode === 401
        ) {

          window.location.href =
            '/login';

          return;
        }

        setMessage(
          requestError?.message ||
          'Unable to update wishlist.'
        );

      } finally {

        setWishlistLoading(
          null
        );

      }

    };


  // ==========================================================
  // ADD TO CART
  // ==========================================================

  const handleAddToCart =
    async (item) => {

      const itemId =
        getItemId(item);

      if (!itemId) {

        setMessage(
          'Unable to identify this item.'
        );

        return;
      }

      if (
        !isBuyerLoggedIn()
      ) {

        window.location.href =
          '/login';

        return;
      }

      if (
        !(
          getItemType(item) === 'sale' ||
          getItemType(item) === 'donated'
        )
      ) {

        setMessage(
          'Only sale or donation items can be added to cart.'
        );

        return;
      }

      if (
        !canBuyNow(item)
      ) {

        setMessage(
          'This item is no longer available.'
        );

        return;
      }

      try {

        setCartLoading(
          itemId
        );

        await addToCart(
          itemId,
          1
        );

        setCartIds(
          (current) => {

            const next =
              new Set(
                current
              );

            next.add(
              itemId
            );

            return next;
          }
        );

        updateItemFlag(
          itemId,
          'in_cart',
          true
        );

        /*
        Get latest cart count from database
        after successful insertion.
        */

        let newCount = 0;

        try {

          const response =
            await getCart();

          const cart =
            response?.items ||
            response?.cart ||
            response?.data?.items ||
            response?.data?.cart ||
            response?.data ||
            [];

          if (
            Array.isArray(cart)
          ) {

            newCount =
              cart.length;

            const ids =
              cart
                .map(
                  (cartItem) =>
                    getItemId(
                      cartItem?.listing ||
                      cartItem
                    )
                )
                .filter(Boolean);

            setCartIds(
              new Set(ids)
            );

          }

        } catch (cartReloadError) {

          console.warn(
            'Unable to reload cart count:',
            cartReloadError
          );

          newCount =
            cartIds.size + 1;
        }

        /*
        Send event to BuyerHeader.
        */

        window.dispatchEvent(
          new CustomEvent(
            'buyer-cart-updated',
            {
              detail: {
                count: newCount
              }
            }
          )
        );

        setMessage(
          'Item added to cart.'
        );

      } catch (requestError) {

        console.error(
          'Add to cart error:',
          requestError
        );

        if (
          requestError?.status === 401 ||
          requestError?.statusCode === 401
        ) {

          window.location.href =
            '/login';

          return;
        }

        setMessage(
          requestError?.message ||
          'Unable to add item to cart.'
        );

      } finally {

        setCartLoading(
          null
        );

      }

    };


  // ==========================================================
  // BUY NOW (OPEN MODAL)
  // ==========================================================

  const handleBuyNow =
    (item) => {

      const itemId =
        getItemId(item);

      if (!itemId) {

        setMessage(
          'Unable to identify this item.'
        );

        return;
      }

      if (
        !isBuyerLoggedIn()
      ) {

        window.location.href =
          '/login';

        return;
      }

      if (
        !canBuyNow(item)
      ) {

        setMessage(
          'This item is no longer available.'
        );

        return;
      }

      // Open the Buy Now Modal
      setBuyNowItem(item);
    };


  // ==========================================================
  // CONFIRM BUY NOW
  // ==========================================================
  //
  // This uses the existing Buyer Orders service so the order
  // is actually saved to:
  // - orders
  // - order_items
  // - payments
  //
  // The backend also creates the seller notification.
  // ==========================================================

  const handleConfirmBuyNow = async (orderData) => {
    if (!buyNowItem) {
      return;
    }

    const itemId =
      getItemId(buyNowItem);

    if (!itemId) {
      setMessage(
        'Unable to identify this item.'
      );

      return;
    }

    setBuyNowLoading(itemId);

    try {

      /*
      --------------------------------------------------------
      MAP FRONTEND PAYMENT METHOD
      --------------------------------------------------------
      Backend-supported values:
      - CASH_ON_DELIVERY
      - GCASH
      - BANK_TRANSFER
      - OTHER
      --------------------------------------------------------
      */

      const paymentMethodMap = {
        COD: 'CASH_ON_DELIVERY',
        GCash: 'GCASH',
        PayMaya: 'OTHER',
        'Bank Transfer': 'BANK_TRANSFER'
      };

      const paymentMethod =
        paymentMethodMap[
          orderData?.payment?.method
        ] ||
        'OTHER';


      /*
      --------------------------------------------------------
      SHIPPING ADDRESS
      --------------------------------------------------------
      The backend expects shippingAddress as a string.
      Keep all details from the Buy Now form together.
      --------------------------------------------------------
      */

      const shippingAddress = [
        orderData?.shipping?.fullName,
        orderData?.shipping?.phone,
        orderData?.shipping?.address,
        orderData?.shipping?.city,
        orderData?.shipping?.zipCode
      ]
        .filter(Boolean)
        .join(', ');


      /*
      --------------------------------------------------------
      OPTIONAL PAYMENT / ORDER NOTES
      --------------------------------------------------------
      Account details are passed only through the existing
      referenceNumber/notes fields expected by the backend.
      --------------------------------------------------------
      */

      const referenceNumber =
        orderData?.payment?.accountNumber ||
        '';

      const notes = [
        orderData?.payment?.accountName
          ? `Account Name: ${orderData.payment.accountName}`
          : '',
        orderData?.payment?.bankName
          ? `Bank: ${orderData.payment.bankName}`
          : ''
      ]
        .filter(Boolean)
        .join(' | ');


      /*
      --------------------------------------------------------
      REAL DATABASE ORDER
      --------------------------------------------------------
      */

      const selectedSize =
        typeof orderData?.size === 'string'
          ? orderData.size.trim()
          : '';

      const response =
        await createBuyerOrder({
          listingId: itemId,
          quantity:
            Number(orderData?.quantity || 1),
          size:
            selectedSize || null,
          shippingAddress,
          paymentMethod,
          referenceNumber,
          notes
        });


      if (!response?.success) {
        throw new Error(
          response?.message ||
          'Unable to place order.'
        );
      }


      /*
      --------------------------------------------------------
      SUCCESS
      --------------------------------------------------------
      */

      const order =
        response?.order || {};

      const orderNumber =
        order?.order_number ||
        order?.orderNumber ||
        '';

      const successMessage =
        orderNumber
          ? `Order ${orderNumber} placed successfully.`
          : (
              getItemType(buyNowItem) === 'donated'
                ? 'Donation order placed successfully.'
                : 'Order placed successfully.'
            );

      setMessage(
        successMessage
      );

      setBuyNowItem(
        null
      );


      /*
      --------------------------------------------------------
      REFRESH MARKETPLACE
      --------------------------------------------------------
      This updates the current item's availability/status
      after the database order changes its stock.
      --------------------------------------------------------
      */

      await loadMarketplace(
        true
      );

    } catch (error) {

      console.error(
        'Checkout error:',
        error
      );

      if (
        error?.status === 401 ||
        error?.statusCode === 401
      ) {

        window.location.href =
          '/login';

        return;
      }

      setMessage(
        error?.message ||
        'Failed to place order. Please try again.'
      );

    } finally {

      setBuyNowLoading(
        null
      );

    }
  };


  // ==========================================================
  // MESSAGE MODAL
  // ==========================================================

  const handleMessage =
    (item) => {

      if (
        !isBuyerLoggedIn()
      ) {

        window.location.href =
          '/login';

        return;
      }

      const sellerId =
        getSellerId(item);

      if (!sellerId) {

        setMessage(
          'Unable to identify the seller.'
        );

        return;
      }

      setMessageItem(
        item
      );

      setMessageText('');

    };


  // ==========================================================
  // SEND MESSAGE
  // ==========================================================

  const handleSendMessage =
    async () => {

      if (
        !messageItem
      ) {
        return;
      }

      const receiverId =
        getSellerId(
          messageItem
        );

      const listingId =
        getItemId(
          messageItem
        );

      const trimmed =
        messageText.trim();

      if (!receiverId) {

        setMessage(
          'Unable to identify the seller.'
        );

        return;
      }

      if (!trimmed) {

        setMessage(
          'Please enter a message.'
        );

        return;
      }

      try {

        setSendingMessage(
          true
        );

        await sendBuyerMessage(
          {
            receiverId,
            message: trimmed,
            listingId:
              listingId || null,
            orderId:
              null
          }
        );

        setMessage(
          'Message sent successfully.'
        );

        setMessageItem(
          null
        );

        setMessageText('');

      } catch (requestError) {

        console.error(
          'Send buyer message error:',
          requestError
        );

        if (
          requestError?.status === 401 ||
          requestError?.statusCode === 401
        ) {

          window.location.href =
            '/login';

          return;
        }

        setMessage(
          requestError?.message ||
          'Unable to send message.'
        );

      } finally {

        setSendingMessage(
          false
        );

      }

    };


  // ==========================================================
  // VIEW
  // ==========================================================

  const handleView =
    (item) => {

      setSelectedItem(
        item
      );

    };


  // ==========================================================
  // REFRESH
  // ==========================================================

  const handleRefresh =
    async () => {

      await Promise.all([
        loadWishlist(),
        loadCart()
      ]);

      await loadMarketplace(
        true
      );

    };


  // ==========================================================
  // SEARCH
  // ==========================================================

  const handleSearchSubmit =
    (event) => {

      event.preventDefault();

      setPage(1);

      setSearch(
        (current) =>
          current.trim()
      );

    };


  // ==========================================================
  // FILTERS
  // ==========================================================

  const handleCategoryChange =
    (value) => {

      setCategory(
        value
      );

      setPage(1);

    };


  const handleTabChange =
    (value) => {

      setActiveTab(
        value
      );

      setPage(1);

    };


  const clearFilters =
    () => {

      setSearch('');

      setCategory(
        'all'
      );

      setPriceRange(
        'all'
      );

      setCondition(
        'all'
      );

      setSortBy(
        'newest'
      );

      setActiveTab(
        'all'
      );

      setPage(1);

    };


  // ==========================================================
  // PAGINATION
  // ==========================================================

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalItems /
        LIMIT
      )
    );


  const displayItems =
    useMemo(
      () => (
        Array.isArray(items)
          ? items
          : []
      ),
      [items]
    );


  const displayedStart =
    totalItems === 0
      ? 0
      : (
          (page - 1) *
          LIMIT
        ) + 1;


  const displayedEnd =
    Math.min(
      page * LIMIT,
      totalItems
    );


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div
      className="buyer-marketplace"
    >

      {/* ====================================================
          HEADING
      ==================================================== */}

      <div
        className="marketplace-heading"
      >

        <h1>
          Marketplace
        </h1>

        <p>
          Discover items available in the
          ReUseConnect community.
        </p>

      </div>


      {/* ====================================================
          FILTER PANEL
      ==================================================== */}

      <div
        className="marketplace-filter-panel"
      >

        <form
          className="marketplace-filter-row"
          onSubmit={
            handleSearchSubmit
          }
        >

          {/* SEARCH */}

          <div
            className="marketplace-search"
          >

            <Search size={16} />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search items..."
            />

            {search && (
              <button
                type="button"
                className="marketplace-clear-search"
                onClick={() => {

                  setSearch('');

                  setPage(1);

                }}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}

          </div>


          {/* CATEGORY */}

          <div
            className="marketplace-select"
          >

            <label>
              Category
            </label>

            <div
              className="select-wrapper"
            >

              <select
                value={category}
                onChange={(event) =>
                  handleCategoryChange(
                    event.target.value
                  )
                }
              >

                <option value="all">
                  All Categories
                </option>

                {categories.map(
                  (categoryItem) => {

                    const id =
                      categoryItem?.category_id ??
                      categoryItem?.id;

                    const name =
                      categoryItem?.name ||
                      categoryItem?.category_name ||
                      categoryItem?.title ||
                      'Category';

                    return (
                      <option
                        key={id || name}
                        value={id}
                      >
                        {name}
                      </option>
                    );

                  }
                )}

              </select>

              <ChevronDown
                size={13}
              />

            </div>

          </div>


          {/* PRICE */}

          <div
            className="marketplace-select"
          >

            <label>
              Price
            </label>

            <div
              className="select-wrapper"
            >

              <select
                value={priceRange}
                onChange={(event) => {

                  setPriceRange(
                    event.target.value
                  );

                  setPage(1);

                }}
              >

                <option value="all">
                  All Prices
                </option>

                <option value="0-500">
                  Under ₱500
                </option>

                <option value="500-1000">
                  ₱500 - ₱1,000
                </option>

                <option value="1000-5000">
                  ₱1,000 - ₱5,000
                </option>

                <option value="5000+">
                  ₱5,000+
                </option>

              </select>

              <ChevronDown
                size={13}
              />

            </div>

          </div>


          {/* CONDITION */}

          <div
            className="marketplace-select"
          >

            <label>
              Condition
            </label>

            <div
              className="select-wrapper"
            >

              <select
                value={condition}
                onChange={(event) => {

                  setCondition(
                    event.target.value
                  );

                  setPage(1);

                }}
              >

                <option value="all">
                  All Conditions
                </option>

                <option value="NEW">
                  New
                </option>

                <option value="LIKE_NEW">
                  Like New
                </option>

                <option value="GOOD">
                  Good
                </option>

                <option value="FAIR">
                  Fair
                </option>

                <option value="POOR">
                  Poor
                </option>

              </select>

              <ChevronDown
                size={13}
              />

            </div>

          </div>


          {/* SORT */}

          <div
            className="marketplace-select"
          >

            <label>
              Sort By
            </label>

            <div
              className="select-wrapper"
            >

              <select
                value={sortBy}
                onChange={(event) => {

                  setSortBy(
                    event.target.value
                  );

                  setPage(1);

                }}
              >

                <option value="newest">
                  Newest
                </option>

                <option value="oldest">
                  Oldest
                </option>

                <option value="price_low">
                  Price: Low to High
                </option>

                <option value="price_high">
                  Price: High to Low
                </option>

                <option value="rating">
                  Highest Rated
                </option>

              </select>

              <ChevronDown
                size={13}
              />

            </div>

          </div>


          {/* SEARCH BUTTON */}

          <button
            type="submit"
            className="marketplace-search-button"
          >
            <Search size={14} />

            Search

          </button>

        </form>


        {/* ==================================================
            TABS
        ================================================== */}

        <div
          className="marketplace-tabs"
        >

          <button
            type="button"
            className={`marketplace-tab ${
              activeTab === 'all'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              handleTabChange(
                'all'
              )
            }
          >
            <Grid2X2 size={14} />

            All
          </button>


          <button
            type="button"
            className={`marketplace-tab ${
              activeTab === 'sale'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              handleTabChange(
                'sale'
              )
            }
          >
            <Tag size={14} />

            For Sale
          </button>

        </div>

      </div>


      {/* ====================================================
          TOAST
      ==================================================== */}

      {message && (
        <div
          className="marketplace-toast"
        >
          {message}
        </div>
      )}


      {/* ====================================================
          ERROR
      ==================================================== */}

      {error && (
        <div
          className="marketplace-error"
        >

          <RefreshCw
            size={20}
          />

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() =>
              loadMarketplace()
            }
          >
            Try Again
          </button>

        </div>
      )}


      {/* ====================================================
          MAIN CONTENT
      ==================================================== */}

      <div
        className="marketplace-content"
      >

        {/* ==================================================
            MAIN COLUMN
        ================================================== */}

        <div
          className="marketplace-main-column"
        >

          <div
            className="featured-heading"
          >

            <div>

              <h2>
                Featured Items
              </h2>

              <span>
                ({totalItems} items)
              </span>

            </div>


            <button
              type="button"
              className="marketplace-refresh-btn"
              onClick={
                handleRefresh
              }
              disabled={
                refreshing
              }
            >

              <RefreshCw
                size={13}
                className={
                  refreshing
                    ? 'marketplace-spin'
                    : ''
                }
              />

              Refresh

            </button>

          </div>


          {/* LOADING */}

          {loading ? (

            <div
              className="marketplace-loading"
            >

              <div
                className="marketplace-spinner"
              />

              <p>
                Loading marketplace items...
              </p>

            </div>

          ) : displayItems.length === 0 ? (

            <div
              className="marketplace-empty"
            >

              <Package
                size={45}
              />

              <h3>
                No items found
              </h3>

              <p>
                Try changing your search
                or filters.
              </p>

              <button
                type="button"
                onClick={
                  clearFilters
                }
              >
                Clear Filters
              </button>

            </div>

          ) : (

            <>

              <div
                className={
                  viewMode === 'list'
                    ? 'marketplace-grid list-view'
                    : 'marketplace-grid'
                }
              >

                {displayItems.map(
                  (
                    item,
                    index
                  ) => (

                    <MarketplaceCard
                      key={
                        getItemId(item) ||
                        `marketplace-item-${index}`
                      }
                      item={item}
                      onWishlist={
                        handleWishlist
                      }
                      onCart={
                        handleAddToCart
                      }
                      onBuyNow={
                        handleBuyNow
                      }
                      onView={
                        handleView
                      }
                      onMessage={
                        handleMessage
                      }
                      wishlistLoading={
                        wishlistLoading ===
                        getItemId(item)
                      }
                      cartLoading={
                        cartLoading ===
                        getItemId(item)
                      }
                      buyNowLoading={
                        buyNowLoading ===
                        getItemId(item)
                      }
                    />

                  )
                )}

              </div>


              {/* PAGINATION */}

              {totalPages > 1 && (

                <div
                  className="marketplace-pagination"
                >

                  <span>
                    Showing{' '}
                    {displayedStart}
                    -
                    {displayedEnd}
                    {' '}of{' '}
                    {totalItems}
                    {' '}items
                  </span>


                  <div
                    className="pagination-buttons"
                  >

                    <button
                      type="button"
                      disabled={
                        page <= 1
                      }
                      onClick={() =>
                        setPage(
                          (current) =>
                            Math.max(
                              1,
                              current - 1
                            )
                        )
                      }
                      aria-label="Previous page"
                    >
                      <ChevronLeft
                        size={14}
                      />
                    </button>


                    {Array.from(
                      {
                        length:
                          Math.min(
                            totalPages,
                            5
                          )
                      },
                      (
                        _,
                        index
                      ) =>
                        index + 1
                    ).map(
                      (
                        pageNumber
                      ) => (

                        <button
                          key={
                            pageNumber
                          }
                          type="button"
                          className={
                            page ===
                            pageNumber
                              ? 'active'
                              : ''
                          }
                          onClick={() =>
                            setPage(
                              pageNumber
                            )
                          }
                        >
                          {
                            pageNumber
                          }
                        </button>

                      )
                    )}


                    <button
                      type="button"
                      disabled={
                        page >=
                        totalPages
                      }
                      onClick={() =>
                        setPage(
                          (current) =>
                            Math.min(
                              totalPages,
                              current + 1
                            )
                        )
                      }
                      aria-label="Next page"
                    >
                      <ChevronRight
                        size={14}
                      />
                    </button>

                  </div>

                </div>

              )}

            </>

          )}

        </div>


        {/* ==================================================
            RIGHT COLUMN
        ================================================== */}

        <aside
          className="marketplace-right-column"
        >

          {/* SECOND LIFE */}

          <div
            className="second-life-card"
          >

            <h3>
              Give Things a Second Life
            </h3>

            <p>
              Find useful pre-loved items,
              save money, and help reduce
              waste in our community.
            </p>

            <div
              className="second-life-decoration"
            >
              ♻
            </div>

          </div>


          {/* QUICK LINKS */}

          <div
            className="quick-links-card"
          >

            <h3>
              Quick Links
            </h3>

            <div
              className="quick-links-grid"
            >

              <button
                type="button"
                onClick={() =>
                  window.location.href =
                    '/buyer/wishlist'
                }
              >
                <Heart
                  size={17}
                />

                My Wishlist
              </button>


              <button
                type="button"
                onClick={() =>
                  window.location.href =
                    '/buyer/cart'
                }
              >
                <ShoppingCart
                  size={17}
                />

                My Cart
              </button>


              <button
                type="button"
                onClick={() =>
                  window.location.href =
                    '/buyer/messages'
                }
              >
                <MessageCircle
                  size={17}
                />

                Messages
              </button>


              <button
                type="button"
                onClick={() =>
                  // CHANGED: Redirecting to transactions module instead of orders
                  window.location.href =
                    '/buyer/transactions'
                }
              >
                <Package
                  size={17}
                />

                My Orders
              </button>

            </div>

          </div>


          {/* WHY REUSECONNECT */}

          <div
            className="why-card"
          >

            <h3>
              Why ReUseConnect?
            </h3>


            <div
              className="why-item"
            >

              <div
                className="why-icon"
              >
                <Recycle
                  size={15}
                />
              </div>

              <div>

                <strong>
                  Reduce Waste
                </strong>

                <span>
                  Keep useful items in circulation.
                </span>

              </div>

            </div>


            <div
              className="why-item"
            >

              <div
                className="why-icon"
              >
                <ShieldCheck
                  size={15}
                />
              </div>

              <div>

                <strong>
                  Trusted Community
                </strong>

                <span>
                  Connect with local users.
                </span>

              </div>

            </div>


            <div
              className="why-item"
            >

              <div
                className="why-icon"
              >
                <Truck
                  size={15}
                />
              </div>

              <div>

                <strong>
                  Easy Transactions
                </strong>

                <span>
                  Buy, trade, or receive items easily.
                </span>

              </div>

            </div>

          </div>


          {/* TOTAL REUSED */}

          <div
            className="total-reused-card"
          >

            <div>

              <span>
                Total Items Reused
              </span>

              <strong>
                {totalReused > 0
                  ? totalReused.toLocaleString()
                  : totalItems.toLocaleString()}
              </strong>

              <small>
                Together we're making a difference!
              </small>

            </div>

            <div
              className="total-reused-icon"
            >
              ♻
            </div>

          </div>

        </aside>

      </div>


      {/* ====================================================
          ITEM DETAILS MODAL
      ==================================================== */}

      {selectedItem && (

        <MarketplaceItemModal
          item={
            selectedItem
          }
          onClose={() =>
            setSelectedItem(
              null
            )
          }
          onWishlist={
            handleWishlist
          }
          onCart={
            handleAddToCart
          }
          onBuyNow={
            handleBuyNow
          }
          onMessage={
            handleMessage
          }
          wishlistLoading={
            wishlistLoading ===
            getItemId(
              selectedItem
            )
          }
          cartLoading={
            cartLoading ===
            getItemId(
              selectedItem
            )
          }
          buyNowLoading={
            buyNowLoading ===
            getItemId(
              selectedItem
            )
              ? getItemId(
                  selectedItem
                )
              : null
          }
        />

      )}


      {/* ====================================================
          BUY NOW MODAL FORM
      ==================================================== */}

      {buyNowItem && (
        <BuyNowModal
          item={buyNowItem}
          onClose={() => setBuyNowItem(null)}
          onConfirm={handleConfirmBuyNow}
          loading={buyNowLoading === getItemId(buyNowItem)}
        />
      )}


      {/* ====================================================
          MESSAGE MODAL
      ==================================================== */}

      {messageItem && (

        <BuyerMessageModal
          item={
            messageItem
          }
          messageText={
            messageText
          }
          setMessageText={
            setMessageText
          }
          sending={
            sendingMessage
          }
          onClose={() => {

            if (
              !sendingMessage
            ) {

              setMessageItem(
                null
              );

              setMessageText('');

            }

          }}
          onSend={
            handleSendMessage
          }
        />

      )}

    </div>
  );
};


export default BuyerMarketplace;