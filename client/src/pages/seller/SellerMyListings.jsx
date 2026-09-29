    import React, {
      useCallback,
      useEffect,
      useMemo,
      useRef,
      useState
    } from 'react';

    import {
      AlertCircle,
      Check,
      ChevronDown,
      ChevronLeft,
      ChevronRight,
      Edit3,
      Eye,
      ImagePlus,
      Package,
      Plus,
      Search,
      Trash2,
      X
    } from 'lucide-react';

    import {
      createSellerListing,
      deactivateSellerListing,
      getSellerListing,
      getSellerListings,
      getSellerListingStats,
      getSellerListingCategories,
      updateSellerListing
    } from '../../services/seller/sellerListingsApi';

    import '../../styles/seller/SellerMyListings.css';

    /*
    |--------------------------------------------------------------------------
    | CONSTANTS
    |--------------------------------------------------------------------------
    */

    const INITIAL_FORM = {
      title: '',
      description: '',
      price: '',
      condition: 'GOOD',
      size: '',
      quantity: 1,
      location: '',
      category_id: '',
      listing_type: 'SALE',
      status: 'PENDING'
    };

    const STATUS_OPTIONS = [
      {
        value: '',
        label: 'All Status'
      },
      {
        value: 'AVAILABLE',
        label: 'Active'
      },
      {
        value: 'PENDING',
        label: 'Pending'
      },
      {
        value: 'HIDDEN',
        label: 'Inactive'
      },
      {
        value: 'RESERVED',
        label: 'Reserved'
      },
      {
        value: 'SOLD',
        label: 'Sold'
      },
      {
        value: 'REJECTED',
        label: 'Rejected'
      }
    ];

    const CONDITION_OPTIONS = [
      {
        value: 'NEW',
        label: 'New'
      },
      {
        value: 'LIKE_NEW',
        label: 'Like New'
      },
      {
        value: 'GOOD',
        label: 'Good'
      },
      {
        value: 'FAIR',
        label: 'Fair'
      },
      {
        value: 'POOR',
        label: 'Poor'
      }
    ];

    const LISTING_TYPE_OPTIONS = [
      {
        value: 'SALE',
        label: 'For Sale'
      },
      {
        value: 'DONATION',
        label: 'Donation'
      },
      {
        value: 'TRADE',
        label: 'For Trade'
      }
    ];

    /*
    |--------------------------------------------------------------------------
    | SIZE OPTIONS
    |--------------------------------------------------------------------------
    |
    | Seller will select the size from this dropdown.
    |
    */

    const SIZE_OPTIONS = [
      {
        value: '',
        label: 'Select size'
      },
      {
        value: 'XS',
        label: 'XS'
      },
      {
        value: 'S',
        label: 'S'
      },
      {
        value: 'M',
        label: 'M'
      },
      {
        value: 'L',
        label: 'L'
      },
      {
        value: 'XL',
        label: 'XL'
      },
      {
        value: 'XXL',
        label: 'XXL'
      },
      {
        value: 'XXXL',
        label: 'XXXL'
      },
      {
        value: 'Free Size',
        label: 'Free Size'
      },
      {
        value: 'Small',
        label: 'Small'
      },
      {
        value: 'Medium',
        label: 'Medium'
      },
      {
        value: 'Large',
        label: 'Large'
      },
      {
        value: 'Not Applicable',
        label: 'Not Applicable'
      }
    ];

    /*
    |--------------------------------------------------------------------------
    | API / IMAGE HELPERS
    |--------------------------------------------------------------------------
    */

    const API_BASE_URL =
      import.meta.env.VITE_API_URL ||
      'http://localhost:5000';

    /*
     * Converts the image value coming from the database/API
     * into the actual public image URL.
     */

    const getImageUrl = (image) => {
      if (!image) {
        return '';
      }

      let value = '';

      if (typeof image === 'string') {
        value = image.trim();
      } else if (typeof image === 'object') {
        value = String(
          image.image_url ||
          image.primary_image_url ||
          image.url ||
          image.image ||
          image.path ||
          image.filename ||
          ''
        ).trim();
      }

      if (!value) {
        return '';
      }

      /*
      |--------------------------------------------------------------------------
      | Browser blob/data URLs
      |--------------------------------------------------------------------------
      */

      if (
        value.startsWith('data:') ||
        value.startsWith('blob:')
      ) {
        return value;
      }

      /*
      |--------------------------------------------------------------------------
      | Protocol-relative URL
      |--------------------------------------------------------------------------
      */

      if (value.startsWith('//')) {
        return `${window.location.protocol}${value}`;
      }

      /*
      |--------------------------------------------------------------------------
      | Absolute HTTP/HTTPS URL
      |--------------------------------------------------------------------------
      */

      if (
        value.startsWith('http://') ||
        value.startsWith('https://')
      ) {
        return value;
      }

      /*
      |--------------------------------------------------------------------------
      | Remove query/hash before processing filename/path
      |--------------------------------------------------------------------------
      */

      const cleanValue = value
        .split('?')[0]
        .split('#')[0]
        .trim();

      /*
      |--------------------------------------------------------------------------
      | Existing public seller image endpoint
      |--------------------------------------------------------------------------
      */

      if (
        cleanValue.includes(
          '/api/seller/listings/image/'
        )
      ) {
        const filename =
          cleanValue
            .split('/')
            .pop();

        if (!filename) {
          return '';
        }

        return (
          `${API_BASE_URL}` +
          `/api/seller/listings/image/` +
          `${encodeURIComponent(
            decodeURIComponent(filename)
          )}`
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Stored uploads/listings path
      |--------------------------------------------------------------------------
      */

      if (
        cleanValue.startsWith(
          '/uploads/listings/'
        ) ||
        cleanValue.includes(
          '/uploads/listings/'
        )
      ) {
        const filename =
          cleanValue
            .split('/')
            .pop();

        if (!filename) {
          return '';
        }

        return (
          `${API_BASE_URL}` +
          `/api/seller/listings/image/` +
          `${encodeURIComponent(
            decodeURIComponent(filename)
          )}`
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Just filename
      |--------------------------------------------------------------------------
      */

      if (
        !cleanValue.includes('/') &&
        !cleanValue.includes('\\')
      ) {
        return (
          `${API_BASE_URL}` +
          `/api/seller/listings/image/` +
          `${encodeURIComponent(
            cleanValue
          )}`
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Other absolute paths
      |--------------------------------------------------------------------------
      */

      if (cleanValue.startsWith('/')) {
        return (
          `${API_BASE_URL}${cleanValue}`
        );
      }

      return (
        `${API_BASE_URL}/${cleanValue}`
      );
    };

    /*
    |--------------------------------------------------------------------------
    | GET LISTING IMAGES
    |--------------------------------------------------------------------------
    */

    const getListingImages = (listing) => {
      if (!listing) {
        return [];
      }

      const result = [];

      /*
      |--------------------------------------------------------------------------
      | Full images array
      |--------------------------------------------------------------------------
      */

      if (
        Array.isArray(listing.images)
      ) {
        listing.images.forEach((image) => {
          const imageUrl =
            getImageUrl(image);

          if (imageUrl) {
            result.push(imageUrl);
          }
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Primary image URL
      |--------------------------------------------------------------------------
      */

      if (
        listing.primary_image_url
      ) {
        const imageUrl =
          getImageUrl(
            listing.primary_image_url
          );

        if (
          imageUrl &&
          !result.includes(imageUrl)
        ) {
          result.unshift(imageUrl);
        }
      }

      /*
      |--------------------------------------------------------------------------
      | image_url
      |--------------------------------------------------------------------------
      */

      if (
        listing.image_url
      ) {
        const imageUrl =
          getImageUrl(
            listing.image_url
          );

        if (
          imageUrl &&
          !result.includes(imageUrl)
        ) {
          result.unshift(imageUrl);
        }
      }

      /*
      |--------------------------------------------------------------------------
      | primary_image
      |--------------------------------------------------------------------------
      */

      if (
        listing.primary_image
      ) {
        const imageUrl =
          getImageUrl(
            listing.primary_image
          );

        if (
          imageUrl &&
          !result.includes(imageUrl)
        ) {
          result.unshift(imageUrl);
        }
      }

      /*
      |--------------------------------------------------------------------------
      | image
      |--------------------------------------------------------------------------
      */

      if (
        listing.image
      ) {
        const imageUrl =
          getImageUrl(
            listing.image
          );

        if (
          imageUrl &&
          !result.includes(imageUrl)
        ) {
          result.unshift(imageUrl);
        }
      }

      return result;
    };

    /*
    |--------------------------------------------------------------------------
    | STATUS HELPERS
    |--------------------------------------------------------------------------
    */

    const getStatusClass = (status) => {
      const value =
        String(status || '')
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '-');

      return `status-${value}`;
    };

    const normalizeStatusForApi = (status) => {
      const value =
        String(status || '')
          .trim()
          .toUpperCase()
          .replace(/\s+/g, '_');

      const map = {
        ACTIVE: 'AVAILABLE',
        AVAILABLE: 'AVAILABLE',
        PENDING: 'PENDING',
        INACTIVE: 'HIDDEN',
        HIDDEN: 'HIDDEN',
        RESERVED: 'RESERVED',
        SOLD: 'SOLD',
        REJECTED: 'REJECTED'
      };

      return map[value] || 'PENDING';
    };

    const normalizeConditionForApi = (condition) => {
      const value =
        String(condition || '')
          .trim()
          .toUpperCase()
          .replace(/\s+/g, '_');

      const map = {
        NEW: 'NEW',
        LIKE_NEW: 'LIKE_NEW',
        GOOD: 'GOOD',
        FAIR: 'FAIR',
        POOR: 'POOR'
      };

      return map[value] || 'GOOD';
    };

    const formatStatus = (status) => {
      const value =
        String(status || '')
          .trim()
          .toUpperCase()
          .replace(/\s+/g, '_');

      const map = {
        AVAILABLE: 'Active',
        ACTIVE: 'Active',
        PENDING: 'Pending',
        HIDDEN: 'Inactive',
        INACTIVE: 'Inactive',
        RESERVED: 'Reserved',
        SOLD: 'Sold',
        REJECTED: 'Rejected'
      };

      return map[value] || status || 'Pending';
    };

    const formatCondition = (condition) => {
      const value =
        String(condition || '')
          .trim()
          .toUpperCase()
          .replace(/\s+/g, '_');

      const map = {
        NEW: 'New',
        LIKE_NEW: 'Like New',
        GOOD: 'Good',
        FAIR: 'Fair',
        POOR: 'Poor'
      };

      return map[value] || condition || '';
    };

    const formatPrice = (price) => {
      const number =
        Number(price);

      if (
        !Number.isFinite(number)
      ) {
        return '₱0.00';
      }

      return `₱${number.toLocaleString(
        'en-PH',
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      )}`;
    };

    const getListingId = (listing) => {
      return (
        listing?.listing_id ??
        listing?.id ??
        null
      );
    };

    /*
    |--------------------------------------------------------------------------
    | COMPONENT
    |--------------------------------------------------------------------------
    */

    const SellerMyListings = () => {
      /*
      |--------------------------------------------------------------------------
      | STATE
      |--------------------------------------------------------------------------
      */

      const [
        listings,
        setListings
      ] = useState([]);

      const [
        categories,
        setCategories
      ] = useState([]);

      const [
        stats,
        setStats
      ] = useState({
        total: 0,
        active: 0,
        pending: 0,
        inactive: 0,
        reserved: 0,
        sold: 0,
        rejected: 0
      });

      const [
        loading,
        setLoading
      ] = useState(true);

      const [
        saving,
        setSaving
      ] = useState(false);

      const [
        error,
        setError
      ] = useState('');

      const [
        successMessage,
        setSuccessMessage
      ] = useState('');

      const [
        search,
        setSearch
      ] = useState('');

      const [
        statusFilter,
        setStatusFilter
      ] = useState('');

      const [
        categoryFilter,
        setCategoryFilter
      ] = useState('');

      const [
        conditionFilter,
        setConditionFilter
      ] = useState('');

      const [
        listingTypeFilter,
        setListingTypeFilter
      ] = useState('');

      const [
        currentPage,
        setCurrentPage
      ] = useState(1);

      const [
        itemsPerPage,
        setItemsPerPage
      ] = useState(10);

      const [
        showForm,
        setShowForm
      ] = useState(false);

      const [
        editingListing,
        setEditingListing
      ] = useState(null);

      const [
        viewingListing,
        setViewingListing
      ] = useState(null);

      const [
        form,
        setForm
      ] = useState(INITIAL_FORM);

      /*
      |--------------------------------------------------------------------------
      | IMAGE STATE
      |--------------------------------------------------------------------------
      */

      const [
        selectedImages,
        setSelectedImages
      ] = useState([]);

      const [
        imagePreviews,
        setImagePreviews
      ] = useState([]);

      const [
        existingImages,
        setExistingImages
      ] = useState([]);

      const fileInputRef =
        useRef(null);

      /*
      |--------------------------------------------------------------------------
      | CLEANUP PREVIEW URLS
      |--------------------------------------------------------------------------
      */

      useEffect(() => {
        return () => {
          imagePreviews.forEach(
            (preview) => {
              if (
                preview?.startsWith('blob:')
              ) {
                URL.revokeObjectURL(
                  preview
                );
              }
            }
          );
        };
      }, [imagePreviews]);

      /*
      |--------------------------------------------------------------------------
      | LOAD LISTINGS
      |--------------------------------------------------------------------------
      */

      const loadListings =
        useCallback(
          async () => {
            try {
              setLoading(true);
              setError('');

              const params = {};

              if (
                search.trim()
              ) {
                params.search =
                  search.trim();
              }

              if (
                statusFilter
              ) {
                params.status =
                  statusFilter;
              }

              if (
                categoryFilter
              ) {
                params.category_id =
                  categoryFilter;
              }

              if (
                conditionFilter
              ) {
                params.condition =
                  conditionFilter;
              }

              if (
                listingTypeFilter
              ) {
                params.listing_type =
                  listingTypeFilter;
              }

              const data =
                await getSellerListings(
                  params
                );

              const rows =
                Array.isArray(data)
                  ? data
                  : Array.isArray(
                      data?.items
                    )
                    ? data.items
                    : Array.isArray(
                        data?.listings
                      )
                      ? data.listings
                      : Array.isArray(
                          data?.data
                        )
                        ? data.data
                        : [];

              /*
               * Normalize image values once before saving
               * them into component state.
               */
              const normalizedRows =
                rows.map(
                  (listing) => {
                    const images =
                      getListingImages(
                        listing
                      );

                    return {
                      ...listing,

                      images,

                      image_url:
                        images[0] ||
                        listing.image_url ||
                        '',

                      primary_image_url:
                        images[0] ||
                        listing.primary_image_url ||
                        ''
                    };
                  }
                );

              setListings(
                normalizedRows
              );

              setCurrentPage(1);
            } catch (
              err
            ) {
              console.error(
                'Load seller listings error:',
                err
              );

              setError(
                err?.response?.data?.message ||
                err?.message ||
                'Failed to load your listings.'
              );
            } finally {
              setLoading(false);
            }
          },
          [
            search,
            statusFilter,
            categoryFilter,
            conditionFilter,
            listingTypeFilter
          ]
        );

      /*
      |--------------------------------------------------------------------------
      | LOAD STATS
      |--------------------------------------------------------------------------
      */

      const loadStats =
        useCallback(
          async () => {
            try {
              const data =
                await getSellerListingStats();

              setStats({
                total:
                  Number(
                    data?.total ??
                    data?.totalListings ??
                    0
                  ),

                active:
                  Number(
                    data?.active ??
                    data?.activeListings ??
                    0
                  ),

                pending:
                  Number(
                    data?.pending ??
                    data?.pendingListings ??
                    0
                  ),

                inactive:
                  Number(
                    data?.inactive ??
                    data?.inactiveListings ??
                    0
                  ),

                reserved:
                  Number(
                    data?.reserved ??
                    data?.reservedListings ??
                    0
                  ),

                sold:
                  Number(
                    data?.sold ??
                    data?.soldListings ??
                    0
                  ),

                rejected:
                  Number(
                    data?.rejected ??
                    data?.rejectedListings ??
                    0
                  )
              });
            } catch (
              err
            ) {
              console.error(
                'Stats error:',
                err
              );
            }
          },
          []
        );

      /*
      |--------------------------------------------------------------------------
      | LOAD CATEGORIES
      |--------------------------------------------------------------------------
      */

      const loadCategories =
        useCallback(
          async () => {
            try {
              const data =
                await getSellerListingCategories();

              const rows =
                Array.isArray(data)
                  ? data
                  : Array.isArray(
                      data?.categories
                    )
                    ? data.categories
                    : Array.isArray(
                        data?.data
                      )
                      ? data.data
                      : [];

              setCategories(
                rows
              );
            } catch (
              err
            ) {
              console.error(
                'Categories error:',
                err
              );
            }
          },
          []
        );

      /*
      |--------------------------------------------------------------------------
      | INITIAL LOAD
      |--------------------------------------------------------------------------
      */

      useEffect(() => {
        loadListings();
      }, [
        loadListings
      ]);

      useEffect(() => {
        loadStats();
      }, [
        loadStats
      ]);

      useEffect(() => {
        loadCategories();
      }, [
        loadCategories
      ]);

      /*
      |--------------------------------------------------------------------------
      | AUTO HIDE SUCCESS MESSAGE
      |--------------------------------------------------------------------------
      */

      useEffect(() => {
        if (
          !successMessage
        ) {
          return undefined;
        }

        const timer =
          setTimeout(
            () => {
              setSuccessMessage('');
            },
            3500
          );

        return () => {
          clearTimeout(
            timer
          );
        };
      }, [
        successMessage
      ]);

      /*
      |--------------------------------------------------------------------------
      | FILTERED DATA
      |--------------------------------------------------------------------------
      */

      const filteredListings =
        useMemo(() => {
          let rows =
            Array.isArray(
              listings
            )
              ? [
                  ...listings
                ]
              : [];

          if (
            search.trim()
          ) {
            const query =
              search
                .trim()
                .toLowerCase();

            rows =
              rows.filter(
                (listing) => {
                  return (
                    String(
                      listing.title ||
                      ''
                    )
                      .toLowerCase()
                      .includes(
                        query
                      ) ||

                    String(
                      listing.description ||
                      ''
                    )
                      .toLowerCase()
                      .includes(
                        query
                      ) ||

                    String(
                      listing.location ||
                      ''
                    )
                      .toLowerCase()
                      .includes(
                        query
                      )
                  );
                }
              );
          }

          if (
            statusFilter
          ) {
            rows =
              rows.filter(
                (listing) =>
                  normalizeStatusForApi(
                    listing.status
                  ) ===
                  statusFilter
              );
          }

          if (
            categoryFilter
          ) {
            rows =
              rows.filter(
                (listing) =>
                  String(
                    listing.category_id
                  ) ===
                  String(
                    categoryFilter
                  )
              );
          }

          if (
            conditionFilter
          ) {
            rows =
              rows.filter(
                (listing) =>
                  normalizeConditionForApi(
                    listing.condition
                  ) ===
                  conditionFilter
              );
          }

          if (
            listingTypeFilter
          ) {
            rows =
              rows.filter(
                (listing) =>
                  String(
                    listing.listing_type ||
                    listing.type ||
                    ''
                  )
                    .trim()
                    .toUpperCase() ===
                  listingTypeFilter
              );
          }

          return rows;
        }, [
          listings,
          search,
          statusFilter,
          categoryFilter,
          conditionFilter,
          listingTypeFilter
        ]);

      /*
      |--------------------------------------------------------------------------
      | PAGINATION
      |--------------------------------------------------------------------------
      */

      const totalPages =
        Math.max(
          1,
          Math.ceil(
            filteredListings.length /
            itemsPerPage
          )
        );

      const safeCurrentPage =
        Math.min(
          currentPage,
          totalPages
        );

      const startIndex =
        (safeCurrentPage - 1) *
        itemsPerPage;

      const paginatedListings =
        filteredListings.slice(
          startIndex,
          startIndex +
          itemsPerPage
        );

      /*
      |--------------------------------------------------------------------------
      | FORM HANDLER
      |--------------------------------------------------------------------------
      */

      const handleFormChange = (
        event
      ) => {
        const {
          name,
          value
        } = event.target;

        setForm(
          (previous) => ({
            ...previous,
            [name]: value
          })
        );
      };

      /*
      |--------------------------------------------------------------------------
      | OPEN CREATE FORM
      |--------------------------------------------------------------------------
      */

      const openCreateForm = () => {
        clearImageState();

        setEditingListing(
          null
        );

        setForm({
          ...INITIAL_FORM
        });

        setError('');
        setSuccessMessage('');

        setShowForm(
          true
        );
      };

      /*
      |--------------------------------------------------------------------------
      | OPEN EDIT FORM
      |--------------------------------------------------------------------------
      */

      const openEditForm =
        async (listing) => {
          try {
            setError('');

            clearImageState();

            setEditingListing(
              listing
            );

            setForm({
              title:
                listing.title ||
                '',

              description:
                listing.description ||
                '',

              price:
                listing.price ??
                '',

              condition:
                normalizeConditionForApi(
                  listing.condition
                ),

              size:
                listing.size ||
                '',

              quantity:
                listing.quantity ??
                1,

              location:
                listing.location ||
                '',

              category_id:
                listing.category_id ??
                '',

              listing_type:
                String(
                  listing.listing_type ||
                  'SALE'
                )
                  .trim()
                  .toUpperCase(),

              status:
                normalizeStatusForApi(
                  listing.status
                )
            });

            let fullListing =
              listing;

            const listingId =
              getListingId(
                listing
              );

            if (
              listingId
            ) {
              try {
                const response =
                  await getSellerListing(
                    listingId
                  );

                fullListing =
                  response?.listing ||
                  response ||
                  listing;
              } catch (
                detailError
              ) {
                console.warn(
                  'Unable to load listing details:',
                  detailError
                );
              }
            }

            /*
             * Update size again from the full database
             * listing in case it was not included in the
             * table listing response.
             */
            setForm(
              (previous) => ({
                ...previous,

                size:
                  fullListing.size ||
                  previous.size ||
                  ''
              })
            );

            setExistingImages(
              getListingImages(
                fullListing
              )
            );

            setShowForm(
              true
            );
          } catch (
            err
          ) {
            console.error(
              err
            );

            setError(
              err?.response?.data?.message ||
              err?.message ||
              'Unable to open listing.'
            );
          }
        };

      /*
      |--------------------------------------------------------------------------
      | CLOSE FORM
      |--------------------------------------------------------------------------
      */

      const closeForm = () => {
        clearImageState();

        setShowForm(
          false
        );

        setEditingListing(
          null
        );

        setForm({
          ...INITIAL_FORM
        });
      };

      /*
      |--------------------------------------------------------------------------
      | IMAGE HANDLER
      |--------------------------------------------------------------------------
      */

      const handleImageChange =
        (event) => {
          const files =
            Array.from(
              event.target.files ||
              []
            );

          if (
            files.length === 0
          ) {
            return;
          }

          const validFiles =
            files.filter(
              (file) => {
                const validType =
                  [
                    'image/jpeg',
                    'image/png',
                    'image/webp'
                  ].includes(
                    file.type
                  );

                const validSize =
                  file.size <=
                  5 *
                  1024 *
                  1024;

                return (
                  validType &&
                  validSize
                );
              }
            );

          if (
            validFiles.length !==
            files.length
          ) {
            setError(
              'Some images were not added. Please use JPG, PNG, or WEBP files up to 5MB each.'
            );
          }

          const remainingSlots =
            Math.max(
              0,
              10 -
              selectedImages.length
            );

          const acceptedFiles =
            validFiles.slice(
              0,
              remainingSlots
            );

          const combinedFiles =
            [
              ...selectedImages,
              ...acceptedFiles
            ].slice(
              0,
              10
            );

          const newPreviews =
            acceptedFiles.map(
              (file) =>
                URL.createObjectURL(
                  file
                )
            );

          setSelectedImages(
            combinedFiles
          );

          setImagePreviews(
            (previous) =>
              [
                ...previous,
                ...newPreviews
              ].slice(
                0,
                10
              )
          );

          event.target.value =
            '';
        };

      /*
      |--------------------------------------------------------------------------
      | REMOVE SELECTED IMAGE
      |--------------------------------------------------------------------------
      */

      const removeSelectedImage =
        (index) => {
          setImagePreviews(
            (previous) => {
              const preview =
                previous[index];

              if (
                preview?.startsWith(
                  'blob:'
                )
              ) {
                URL.revokeObjectURL(
                  preview
                );
              }

              return previous.filter(
                (_, imageIndex) =>
                  imageIndex !==
                  index
              );
            }
          );

          setSelectedImages(
            (previous) =>
              previous.filter(
                (_, fileIndex) =>
                  fileIndex !==
                  index
              )
          );
        };

      /*
      |--------------------------------------------------------------------------
      | CLEAR IMAGE STATE
      |--------------------------------------------------------------------------
      */

      const clearImageState =
        () => {
          setImagePreviews(
            (previous) => {
              previous.forEach(
                (preview) => {
                  if (
                    preview?.startsWith(
                      'blob:'
                    )
                  ) {
                    URL.revokeObjectURL(
                      preview
                    );
                  }
                }
              );

              return [];
            }
          );

          setSelectedImages(
            []
          );

          setExistingImages(
            []
          );

          if (
            fileInputRef.current
          ) {
            fileInputRef.current.value =
              '';
          }
        };

      /*
      |--------------------------------------------------------------------------
      | SUBMIT FORM
      |--------------------------------------------------------------------------
      */

      const handleSubmit =
        async (event) => {
          event.preventDefault();

          setSaving(
            true
          );

          setError('');
          setSuccessMessage('');

          try {
            const title =
              String(
                form.title ||
                ''
              ).trim();

            const description =
              String(
                form.description ||
                ''
              ).trim();

            const price =
              Number(
                form.price
              );

            const quantity =
              Number(
                form.quantity
              );

            /*
             * Size is optional because some items may not
             * have a size.
             */
            const size =
              String(
                form.size ||
                ''
              ).trim();

            if (
              !title
            ) {
              throw new Error(
                'Please enter a listing title.'
              );
            }

            if (
              !Number.isFinite(
                price
              ) ||
              price < 0
            ) {
              throw new Error(
                'Please enter a valid price.'
              );
            }

            if (
              !Number.isInteger(
                quantity
              ) ||
              quantity <= 0
            ) {
              throw new Error(
                'Quantity must be greater than 0.'
              );
            }

            const payload = {
              title,

              description,

              price,

              condition:
                normalizeConditionForApi(
                  form.condition
                ),

              size:
                size ||
                null,

              quantity,

              location:
                String(
                  form.location ||
                  ''
                ).trim(),

              category_id:
                form.category_id ||
                null,

              listing_type:
                String(
                  form.listing_type ||
                  'SALE'
                )
                  .trim()
                  .toUpperCase(),

              status:
                normalizeStatusForApi(
                  form.status
                )
            };

            /*
            |--------------------------------------------------------------------------
            | ACTUAL FILE OBJECTS
            |--------------------------------------------------------------------------
            */

            if (
              editingListing
            ) {
              await updateSellerListing(
                getListingId(
                  editingListing
                ),
                payload,
                selectedImages
              );

              setSuccessMessage(
                'Listing updated successfully.'
              );
            } else {
              await createSellerListing(
                payload,
                selectedImages
              );

              setSuccessMessage(
                'Listing created successfully.'
              );
            }

            closeForm();

            await Promise.all([
              loadListings(),
              loadStats()
            ]);
          } catch (
            err
          ) {
            console.error(
              'Save listing error:',
              err
            );

            setError(
              err?.response?.data?.message ||
              err?.message ||
              'Failed to save listing.'
            );
          } finally {
            setSaving(
              false
            );
          }
        };

      /*
      |--------------------------------------------------------------------------
      | DEACTIVATE
      |--------------------------------------------------------------------------
      */

      const handleDeactivate =
        async (listing) => {
          const listingId =
            getListingId(
              listing
            );

          if (
            !listingId
          ) {
            return;
          }

          const confirmed =
            window.confirm(
              `Deactivate "${listing.title}"?`
            );

          if (
            !confirmed
          ) {
            return;
          }

          try {
            setError('');
            setSuccessMessage('');

            await deactivateSellerListing(
              listingId
            );

            setSuccessMessage(
              'Listing deactivated successfully.'
            );

            await Promise.all([
              loadListings(),
              loadStats()
            ]);
          } catch (
            err
          ) {
            console.error(
              err
            );

            setError(
              err?.response?.data?.message ||
              err?.message ||
              'Failed to deactivate listing.'
            );
          }
        };

      /*
      |--------------------------------------------------------------------------
      | VIEW LISTING
      |--------------------------------------------------------------------------
      */

      const handleViewListing =
        async (listing) => {
          try {
            setError('');

            const listingId =
              getListingId(
                listing
              );

            if (
              !listingId
            ) {
              setViewingListing(
                listing
              );

              return;
            }

            try {
              const response =
                await getSellerListing(
                  listingId
                );

              setViewingListing(
                response?.listing ||
                response ||
                listing
              );
            } catch (
              detailError
            ) {
              console.warn(
                'Unable to load listing details:',
                detailError
              );

              setViewingListing(
                listing
              );
            }
          } catch (
            err
          ) {
            console.error(
              err
            );

            setError(
              'Unable to view listing.'
            );
          }
        };

      /*
      |--------------------------------------------------------------------------
      | PAGINATION
      |--------------------------------------------------------------------------
      */

      const goToPage =
        (page) => {
          const nextPage =
            Math.max(
              1,
              Math.min(
                page,
                totalPages
              )
            );

          setCurrentPage(
            nextPage
          );
        };

      const handleItemsPerPageChange =
        (event) => {
          setItemsPerPage(
            Number(
              event.target.value
            )
          );

          setCurrentPage(
            1
          );
        };

      /*
      |--------------------------------------------------------------------------
      | RENDER
      |--------------------------------------------------------------------------
      */

      return (
        <main className="seller-my-listings">

          <section className="listings-content">

            {/* ==================================================
                TOOLBAR
            ================================================== */}

            <div className="listings-toolbar">

              <div className="listing-tabs">

                <button
                  type="button"
                  className={`listing-tab ${
                    listingTypeFilter === ''
                      ? 'active'
                      : ''
                  }`}
                  onClick={() => {
                    setListingTypeFilter('');
                    setCurrentPage(1);
                  }}
                >
                  <Package size={17} />

                  <span>
                    All Listings
                  </span>
                </button>

                <button
                  type="button"
                  className={`listing-tab ${
                    listingTypeFilter === 'SALE'
                      ? 'active'
                      : ''
                  }`}
                  onClick={() => {
                    setListingTypeFilter('SALE');
                    setCurrentPage(1);
                  }}
                >
                  <Package size={17} />

                  <span>
                    For Sale
                  </span>
                </button>

                <button
                  type="button"
                  className={`listing-tab ${
                    listingTypeFilter === 'DONATION'
                      ? 'active'
                      : ''
                  }`}
                  onClick={() => {
                    setListingTypeFilter('DONATION');
                    setCurrentPage(1);
                  }}
                >
                  <Plus size={17} />

                  <span>
                    Donation
                  </span>
                </button>

              </div>

              <div className="listings-toolbar-actions">

                <button
                  type="button"
                  className="refresh-listings-button"
                  onClick={() => {
                    loadListings();
                    loadStats();
                    loadCategories();
                  }}
                  title="Refresh listings"
                >
                  <span className="refresh-icon">
                    ↻
                  </span>
                </button>

                <button
                  type="button"
                  className="add-listing-button"
                  onClick={
                    openCreateForm
                  }
                >
                  <Plus size={18} />

                  <span>
                    Add New Listing
                  </span>
                </button>

              </div>

            </div>

            {/* ==================================================
                STATS
            ================================================== */}

            <div className="listing-stats-grid">

              <div className="listing-stat-card purple">

                <div className="listing-stat-icon">
                  <Package size={22} />
                </div>

                <div>
                  <span>
                    Total Listings
                  </span>

                  <strong>
                    {stats.total}
                  </strong>

                  <small>
                    All items in your store
                  </small>
                </div>

              </div>

              <div className="listing-stat-card green">

                <div className="listing-stat-icon">
                  <Check size={22} />
                </div>

                <div>
                  <span>
                    Active Listings
                  </span>

                  <strong>
                    {stats.active}
                  </strong>

                  <small>
                    Currently available
                  </small>
                </div>

              </div>

              <div className="listing-stat-card orange">

                <div className="listing-stat-icon">
                  <Package size={22} />
                </div>

                <div>
                  <span>
                    Sold Listings
                  </span>

                  <strong>
                    {stats.sold}
                  </strong>

                  <small>
                    Successfully sold
                  </small>
                </div>

              </div>

              <div className="listing-stat-card blue">

                <div className="listing-stat-icon">
                  <AlertCircle size={22} />
                </div>

                <div>
                  <span>
                    Inactive Listings
                  </span>

                  <strong>
                    {stats.inactive}
                  </strong>

                  <small>
                    Not currently visible
                  </small>
                </div>

              </div>

            </div>

            {/* ==================================================
                ALERTS
            ================================================== */}

            {error && (
              <div className="listing-alert error">

                <AlertCircle size={17} />

                <span>
                  {error}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setError('')
                  }
                  aria-label="Close error"
                >
                  <X size={15} />
                </button>

              </div>
            )}

            {successMessage && (
              <div className="listing-alert success">

                <Check size={17} />

                <span>
                  {successMessage}
                </span>

              </div>
            )}

            {/* ==================================================
                TWO COLUMNS
            ================================================== */}

            <div className="listings-layout">

              <section className="my-listings-card">

                <div className="my-listings-header">

                  <div>

                    <h2>
                      My Listings
                    </h2>

                    <p>
                      Here are all your listed items. You can edit or deactivate them anytime.
                    </p>

                  </div>

                  <div className="listing-search">

                    <Search size={17} />

                    <input
                      type="text"
                      value={search}
                      onChange={(event) => {
                        setSearch(
                          event.target.value
                        );

                        setCurrentPage(1);
                      }}
                      placeholder="Search your listings..."
                    />

                  </div>

                </div>

                <div className="listings-table-wrapper">

                  <table className="listings-table">

                    <thead>

                      <tr>

                        <th>
                          Image
                        </th>

                        <th>
                          Item Details
                        </th>

                        <th>
                          Price
                        </th>

                        <th>
                          Status
                        </th>

                        <th>
                          Views
                        </th>

                        <th>
                          Actions
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {loading ? (

                        <tr>

                          <td
                            colSpan="6"
                            className="table-state"
                          >
                            Loading your listings...
                          </td>

                        </tr>

                      ) : paginatedListings.length === 0 ? (

                        <tr>

                          <td
                            colSpan="6"
                            className="table-state empty"
                          >

                            <Package size={32} />

                            <strong>
                              No listings found
                            </strong>

                            <span>
                              No listings match the selected type or status filter.
                            </span>

                          </td>

                        </tr>

                      ) : (

                        paginatedListings.map(
                          (listing) => {

                            const images =
                              getListingImages(
                                listing
                              );

                            const image =
                              images[0] ||
                              '';

                            const normalizedStatus =
                              normalizeStatusForApi(
                                listing.status
                              );

                            const imageSrc =
                              getImageUrl(
                                image
                              );

                            return (
                              <tr
                                key={
                                  getListingId(
                                    listing
                                  )
                                }
                              >

                                {/* ==================================================
                                    IMAGE
                                ================================================== */}

                                <td>

                                  <div className="listing-image">

                                    {imageSrc ? (

                                      <img
                                        src={
                                          imageSrc
                                        }
                                        alt={
                                          listing.title ||
                                          'Listing'
                                        }
                                        loading="lazy"
                                        onError={(
                                          event
                                        ) => {
                                          console.error(
                                            'Listing image failed to load:',
                                            imageSrc
                                          );

                                          event.currentTarget.style.display =
                                            'none';

                                          const fallback =
                                            event.currentTarget.parentElement?.querySelector(
                                              '.listing-image-placeholder'
                                            );

                                          if (
                                            fallback
                                          ) {
                                            fallback.style.display =
                                              'flex';
                                          }
                                        }}
                                      />

                                    ) : null}

                                    <div
                                      className="listing-image-placeholder"
                                      style={{
                                        display:
                                          imageSrc
                                            ? 'none'
                                            : 'flex'
                                      }}
                                    >
                                      <Package size={22} />
                                    </div>

                                  </div>

                                </td>

                                {/* ==================================================
                                    ITEM DETAILS
                                ================================================== */}

                                <td>

                                  <div className="listing-details">

                                    <strong>
                                      {
                                        listing.title ||
                                        'Untitled Listing'
                                      }
                                    </strong>

                                    <span>
                                      {
                                        listing.category_name ||
                                        listing.category ||
                                        'Uncategorized'
                                      }
                                    </span>

                                    <small>
                                      {
                                        LISTING_TYPE_OPTIONS.find(
                                          (option) =>
                                            option.value ===
                                            String(
                                              listing.listing_type ||
                                              listing.type ||
                                              'SALE'
                                            )
                                              .trim()
                                              .toUpperCase()
                                        )?.label ||
                                        'For Sale'
                                      }
                                    </small>

                                  </div>

                                </td>

                                {/* ==================================================
                                    PRICE
                                ================================================== */}

                                <td>

                                  <strong className="listing-price">
                                    {String(
                                      listing.listing_type ||
                                      listing.type ||
                                      'SALE'
                                    )
                                      .trim()
                                      .toUpperCase() === 'DONATION'
                                      ? 'FREE'
                                      : String(
                                          listing.listing_type ||
                                          listing.type ||
                                          'SALE'
                                        )
                                          .trim()
                                          .toUpperCase() === 'TRADE'
                                        ? 'For Trade'
                                        : formatPrice(
                                            listing.price
                                          )}
                                  </strong>

                                </td>

                                {/* ==================================================
                                    STATUS
                                ================================================== */}

                                <td>

                                  <span
                                    className={`listing-status ${getStatusClass(
                                      formatStatus(
                                        listing.status
                                      )
                                    )}`}
                                  >
                                    {
                                      formatStatus(
                                        listing.status
                                      )
                                    }
                                  </span>

                                </td>

                                {/* ==================================================
                                    VIEWS
                                ================================================== */}

                                <td>

                                  <span className="listing-views">

                                    <Eye size={14} />

                                    {
                                      Number(
                                        listing.views ||
                                        0
                                      )
                                    }

                                  </span>

                                </td>

                                {/* ==================================================
                                    ACTIONS
                                ================================================== */}

                                <td>

                                  <div className="listing-actions">

                                    <button
                                      type="button"
                                      className="action-icon view"
                                      title="View listing"
                                      onClick={() =>
                                        handleViewListing(
                                          listing
                                        )
                                      }
                                    >
                                      <Eye size={16} />
                                    </button>

                                    <button
                                      type="button"
                                      className="action-icon edit"
                                      title="Edit listing"
                                      onClick={() =>
                                        openEditForm(
                                          listing
                                        )
                                      }
                                    >
                                      <Edit3 size={16} />
                                    </button>

                                    {normalizedStatus !==
                                      'HIDDEN' &&
                                      normalizedStatus !==
                                      'SOLD' && (

                                        <button
                                          type="button"
                                          className="action-icon deactivate"
                                          title="Deactivate listing"
                                          onClick={() =>
                                            handleDeactivate(
                                              listing
                                            )
                                          }
                                        >
                                          <Trash2 size={16} />
                                        </button>

                                      )}

                                  </div>

                                </td>

                              </tr>
                            );
                          }
                        )

                      )}

                    </tbody>

                  </table>

                </div>

                {!loading &&
                  filteredListings.length > 0 && (

                    <div className="listings-pagination">

                      <span>
                        Showing{' '}
                        {startIndex + 1}
                        {'–'}
                        {Math.min(
                          startIndex +
                          itemsPerPage,
                          filteredListings.length
                        )}
                        {' of '}
                        {filteredListings.length}
                        {' listings'}
                      </span>

                      <div>

                        <button
                          type="button"
                          disabled={
                            safeCurrentPage <= 1
                          }
                          onClick={() =>
                            goToPage(
                              safeCurrentPage - 1
                            )
                          }
                          aria-label="Previous page"
                        >
                          <ChevronLeft size={16} />
                        </button>

                        <span className="current-page">
                          {safeCurrentPage}
                        </span>

                        <button
                          type="button"
                          disabled={
                            safeCurrentPage >=
                            totalPages
                          }
                          onClick={() =>
                            goToPage(
                              safeCurrentPage + 1
                            )
                          }
                          aria-label="Next page"
                        >
                          <ChevronRight size={16} />
                        </button>

                      </div>

                    </div>

                  )}

              </section>

              {/* ==================================================
                  RIGHT COLUMN
              ================================================== */}

              <aside className="listings-side-column">

                <div className="listing-impact-card">

                  <div className="impact-illustration">
                    <span className="impact-leaf">
                      ⌁
                    </span>
                  </div>

                  <div>

                    <h3>
                      Small steps,
                      <br />
                      big impact.
                    </h3>

                    <p>
                      Your pre-loved items are making a difference.
                    </p>

                  </div>

                </div>

                <div className="recent-activity-card">

                  <div className="side-card-heading">

                    <h3>
                      Recent Activity
                    </h3>

                    <span>
                      Latest
                    </span>

                  </div>

                  {paginatedListings.length > 0 ? (

                    paginatedListings
                      .slice(0, 4)
                      .map(
                        (
                          listing,
                          index
                        ) => (

                          <div
                            className="activity-item"
                            key={`activity-${getListingId(
                              listing
                            )}`}
                          >

                            <div className="activity-icon">

                              {index === 0 ? (
                                <Plus size={16} />
                              ) : index === 1 ? (
                                <Eye size={16} />
                              ) : index === 2 ? (
                                <Check size={16} />
                              ) : (
                                <Package size={16} />
                              )}

                            </div>

                            <div>

                              <strong>
                                {index === 0
                                  ? 'Listing available'
                                  : index === 1
                                    ? 'Listing viewed'
                                    : index === 2
                                      ? 'Listing status updated'
                                      : 'Listing in your store'}
                              </strong>

                              <span>
                                {
                                  listing.title ||
                                  'Untitled Listing'
                                }
                              </span>

                              <small>
                                {
                                  formatStatus(
                                    listing.status
                                  )
                                }
                              </small>

                            </div>

                          </div>

                        )
                      )

                  ) : (

                    <div className="side-empty">
                      No recent listing activity.
                    </div>

                  )}

                </div>

                <div className="quick-actions-card">

                  <div className="side-card-heading">

                    <h3>
                      Quick Actions
                    </h3>

                  </div>

                  <div className="quick-actions-grid">

                    <button
                      type="button"
                      onClick={
                        openCreateForm
                      }
                    >
                      <Plus size={18} />

                      <span>
                        Add New Listing
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter('');
                        setListingTypeFilter('');
                        setCurrentPage(1);
                      }}
                    >
                      <Package size={18} />

                      <span>
                        View All Listings
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter(
                          'SOLD'
                        );
                        setCurrentPage(1);
                      }}
                    >
                      <Check size={18} />

                      <span>
                        Sold Items
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        window.location.href =
                          '/seller/reuse-tools';
                      }}
                    >
                      <Eye size={18} />

                      <span>
                        Reuse Tools
                      </span>
                    </button>

                  </div>

                </div>

              </aside>

            </div>

          </section>

          {/* ==========================================================
              ADD / EDIT MODAL
          ========================================================== */}

          {showForm && (

            <div className="seller-listing-modal-backdrop">

              <div className="seller-listing-modal">

                <div className="seller-listing-modal-header">

                  <div>

                    <h3>
                      {editingListing
                        ? 'Edit Listing'
                        : 'Add Listing'}
                    </h3>

                    <p>
                      {editingListing
                        ? 'Update your listing information.'
                        : 'Create a new listing for your products.'}
                    </p>

                  </div>

                  <button
                    type="button"
                    className="modal-close-button"
                    onClick={
                      closeForm
                    }
                    disabled={
                      saving
                    }
                  >
                    <X size={20} />
                  </button>

                </div>

                <form
                  className="seller-listing-form"
                  onSubmit={
                    handleSubmit
                  }
                >

                  <div className="seller-form-grid">

                    <div className="seller-form-field full">

                      <label htmlFor="title">
                        Listing Title
                      </label>

                      <input
                        id="title"
                        name="title"
                        type="text"
                        value={
                          form.title
                        }
                        onChange={
                          handleFormChange
                        }
                        placeholder="Enter listing title"
                        required
                      />

                    </div>

                    <div className="seller-form-field">

                      <label htmlFor="category_id">
                        Category
                      </label>

                      <div className="seller-form-select">

                        <select
                          id="category_id"
                          name="category_id"
                          value={
                            form.category_id
                          }
                          onChange={
                            handleFormChange
                          }
                        >

                          <option value="">
                            Select category
                          </option>

                          {categories.map(
                            (
                              category
                            ) => (

                              <option
                                key={
                                  category.category_id
                                }
                                value={
                                  category.category_id
                                }
                              >
                                {
                                  category.name
                                }
                              </option>

                            )
                          )}

                        </select>

                        <ChevronDown
                          size={16}
                        />

                      </div>

                    </div>

                    <div className="seller-form-field">

                      <label htmlFor="listing_type">
                        Listing Type
                      </label>

                      <div className="seller-form-select">

                        <select
                          id="listing_type"
                          name="listing_type"
                          value={
                            form.listing_type
                          }
                          onChange={
                            handleFormChange
                          }
                        >

                          {LISTING_TYPE_OPTIONS.map(
                            (option) => (

                              <option
                                key={
                                  option.value
                                }
                                value={
                                  option.value
                                }
                              >
                                {
                                  option.label
                                }
                              </option>

                            )
                          )}

                        </select>

                        <ChevronDown
                          size={16}
                        />

                      </div>

                    </div>

                    <div className="seller-form-field">

                      <label htmlFor="condition">
                        Condition
                      </label>

                      <div className="seller-form-select">

                        <select
                          id="condition"
                          name="condition"
                          value={
                            form.condition
                          }
                          onChange={
                            handleFormChange
                          }
                        >

                          {CONDITION_OPTIONS.map(
                            (
                              option
                            ) => (

                              <option
                                key={
                                  option.value
                                }
                                value={
                                  option.value
                                }
                              >
                                {
                                  option.label
                                }
                              </option>

                            )
                          )}

                        </select>

                        <ChevronDown
                          size={16}
                        />

                      </div>

                    </div>

                    {/* ======================================================
                        SIZE DROPDOWN
                    ====================================================== */}

                    <div className="seller-form-field">

                      <label htmlFor="size">
                        Size
                      </label>

                      <div className="seller-form-select">

                        <select
                          id="size"
                          name="size"
                          value={
                            form.size
                          }
                          onChange={
                            handleFormChange
                          }
                        >

                          {SIZE_OPTIONS.map(
                            (option) => (

                              <option
                                key={
                                  option.value
                                }
                                value={
                                  option.value
                                }
                              >
                                {
                                  option.label
                                }
                              </option>

                            )
                          )}

                        </select>

                        <ChevronDown
                          size={16}
                        />

                      </div>

                    </div>

                    <div className="seller-form-field">

                      <label htmlFor="price">
                        Price
                      </label>

                      <div className="seller-price-input">

                        <span>
                          ₱
                        </span>

                        <input
                          id="price"
                          name="price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            form.price
                          }
                          onChange={
                            handleFormChange
                          }
                          placeholder="0.00"
                          required
                        />

                      </div>

                    </div>

                    <div className="seller-form-field">

                      <label htmlFor="quantity">
                        Quantity
                      </label>

                      <div className="seller-quantity-control">

                        <button
                          type="button"
                          className="seller-quantity-button"
                          onClick={() => {
                            setForm(
                              (previous) => ({
                                ...previous,
                                quantity: Math.max(
                                  1,
                                  Number(
                                    previous.quantity
                                  ) - 1
                                )
                              })
                            );
                          }}
                          disabled={
                            Number(form.quantity) <= 1
                          }
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>

                        <input
                          id="quantity"
                          name="quantity"
                          type="number"
                          min="1"
                          step="1"
                          value={
                            form.quantity
                          }
                          onChange={(event) => {
                            const value =
                              Number(
                                event.target.value
                              );

                            setForm(
                              (previous) => ({
                                ...previous,
                                quantity:
                                  Number.isFinite(value) &&
                                  value >= 1
                                    ? Math.floor(value)
                                    : 1
                              })
                            );
                          }}
                          required
                          aria-label="Quantity"
                        />

                        <button
                          type="button"
                          className="seller-quantity-button"
                          onClick={() => {
                            setForm(
                              (previous) => ({
                                ...previous,
                                quantity:
                                  Number(
                                    previous.quantity
                                  ) + 1
                              })
                            );
                          }}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>

                      </div>

                    </div>

                    <div className="seller-form-field full">

                      <label htmlFor="location">
                        Location
                      </label>

                      <input
                        id="location"
                        name="location"
                        type="text"
                        value={
                          form.location
                        }
                        onChange={
                          handleFormChange
                        }
                        placeholder="Enter item location"
                      />

                    </div>

                    <div className="seller-form-field full">

                      <label htmlFor="description">
                        Description
                      </label>

                      <textarea
                        id="description"
                        name="description"
                        rows="5"
                        value={
                          form.description
                        }
                        onChange={
                          handleFormChange
                        }
                        placeholder="Describe your item..."
                      />

                    </div>

                    <div className="seller-form-field full">

                      <label>
                        Listing Status
                      </label>

                      <div className="seller-form-select">

                        <select
                          name="status"
                          value={
                            form.status
                          }
                          onChange={
                            handleFormChange
                          }
                        >

                          {STATUS_OPTIONS
                            .filter(
                              (
                                option
                              ) =>
                                option.value
                            )
                            .map(
                              (
                                option
                              ) => (

                                <option
                                  key={
                                    option.value
                                  }
                                  value={
                                    option.value
                                  }
                                >
                                  {
                                    option.label
                                  }
                                </option>

                              )
                            )}

                        </select>

                        <ChevronDown
                          size={16}
                        />

                      </div>

                    </div>

                    {/* ======================================================
                        IMAGE UPLOAD
                    ====================================================== */}

                    <div className="seller-form-field full">

                      <label>
                        Product Images
                      </label>

                      <div className="seller-image-upload-area">

                        <input
                          ref={
                            fileInputRef
                          }
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          onChange={
                            handleImageChange
                          }
                          style={{
                            display:
                              'none'
                          }}
                        />

                        <button
                          type="button"
                          className="image-upload-button"
                          onClick={() =>
                            fileInputRef.current?.click()
                          }
                          disabled={
                            selectedImages.length >=
                            10
                          }
                        >

                          <ImagePlus
                            size={28}
                          />

                          <strong>
                            Add Product Images
                          </strong>

                          <span>
                            JPG, PNG, or WEBP
                          </span>

                          <small>
                            Maximum 10 images, 5MB each
                          </small>

                        </button>

                        {/* EXISTING DATABASE IMAGES */}

                        {existingImages.length >
                          0 && (

                          <div className="existing-images-section">

                            <span className="image-section-label">
                              Existing Images
                            </span>

                            <div className="seller-image-preview-grid">

                              {existingImages.map(
                                (
                                  image,
                                  index
                                ) => (

                                  <div
                                    className="image-preview-item existing"
                                    key={`${image}-${index}`}
                                  >

                                    <img
                                      src={
                                        getImageUrl(
                                          image
                                        )
                                      }
                                      alt={`Existing ${
                                        index + 1
                                      }`}
                                      onError={(
                                        event
                                      ) => {
                                        event.currentTarget.style.display =
                                          'none';
                                      }}
                                    />

                                    {index ===
                                      0 && (

                                      <span className="primary-image-label">
                                        Primary
                                      </span>

                                    )}

                                  </div>

                                )
                              )}

                            </div>

                          </div>

                        )}

                        {/* NEW SELECTED FILES */}

                        {selectedImages.length >
                          0 && (

                          <div className="selected-images-section">

                            <span className="image-section-label">
                              New Images
                            </span>

                            <div className="seller-image-preview-grid">

                              {imagePreviews.map(
                                (
                                  preview,
                                  index
                                ) => (

                                  <div
                                    className="image-preview-item"
                                    key={`${preview}-${index}`}
                                  >

                                    <img
                                      src={
                                        preview
                                      }
                                      alt={`New ${
                                        index + 1
                                      }`}
                                    />

                                    {index ===
                                      0 &&
                                      existingImages.length ===
                                        0 && (

                                      <span className="primary-image-label">
                                        Primary
                                      </span>

                                    )}

                                    <button
                                      type="button"
                                      className="remove-image-button"
                                      onClick={() =>
                                        removeSelectedImage(
                                          index
                                        )
                                      }
                                      aria-label="Remove image"
                                    >
                                      <X
                                        size={14}
                                      />
                                    </button>

                                  </div>

                                )
                              )}

                            </div>

                          </div>

                        )}

                      </div>

                      <p className="image-upload-note">
                        The selected images will be uploaded to the server and saved to your listing.
                      </p>

                    </div>

                  </div>

                  <div className="seller-listing-modal-footer">

                    <button
                      type="button"
                      className="cancel-listing-button"
                      onClick={
                        closeForm
                      }
                      disabled={
                        saving
                      }
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="save-listing-button"
                      disabled={
                        saving
                      }
                    >

                      {saving ? (

                        <>
                          <span className="button-spinner" />

                          Saving...
                        </>

                      ) : (

                        <>
                          <Check
                            size={17}
                          />

                          {editingListing
                            ? 'Save Changes'
                            : 'Create Listing'}
                        </>

                      )}

                    </button>

                  </div>

                </form>

              </div>

            </div>

          )}

          {/* ==========================================================
              VIEW MODAL
          ========================================================== */}

          {viewingListing && (

            <div className="seller-listing-modal-backdrop">

              <div className="seller-listing-view-modal">

                <div className="seller-listing-modal-header">

                  <div>

                    <h3>
                      Listing Details
                    </h3>

                    <p>
                      View your listing information.
                    </p>

                  </div>

                  <button
                    type="button"
                    className="modal-close-button"
                    onClick={() =>
                      setViewingListing(
                        null
                      )
                    }
                  >
                    <X size={20} />
                  </button>

                </div>

                <div className="seller-listing-view-content">

                  <div className="seller-view-images">

                    {getListingImages(
                      viewingListing
                    ).length > 0 ? (

                      getListingImages(
                        viewingListing
                      ).map(
                        (
                          image,
                          index
                        ) => (

                          <div
                            className="seller-view-image"
                            key={`${image}-${index}`}
                          >

                            <img
                              src={
                                getImageUrl(
                                  image
                                )
                              }
                              alt={`${viewingListing.title} ${
                                index + 1
                              }`}
                              onError={(
                                event
                              ) => {
                                event.currentTarget.style.display =
                                  'none';
                              }}
                            />

                          </div>

                        )
                      )

                    ) : (

                      <div className="seller-view-no-image">

                        <ImagePlus
                          size={42}
                        />

                        <span>
                          No image uploaded
                        </span>

                      </div>

                    )}

                  </div>

                  <div className="seller-view-details">

                    <h2>
                      {
                        viewingListing.title ||
                        'Untitled Listing'
                      }
                    </h2>

                    <div className="seller-view-status-row">

                      <span
                        className={`listing-status-badge ${getStatusClass(
                          formatStatus(
                            viewingListing.status
                          )
                        )}`}
                      >
                        {
                          formatStatus(
                            viewingListing.status
                          )
                        }
                      </span>

                    </div>

                    <div className="seller-view-price">

                      {
                        formatPrice(
                          viewingListing.price
                        )
                      }

                    </div>

                    <div className="seller-view-info-grid">

                      <div>

                        <span>
                          Category
                        </span>

                        <strong>
                          {
                            viewingListing.category_name ||
                            viewingListing.category ||
                            '—'
                          }
                        </strong>

                      </div>

                      <div>

                        <span>
                          Listing Type
                        </span>

                        <strong>
                          {
                            LISTING_TYPE_OPTIONS.find(
                              (option) =>
                                option.value ===
                                String(
                                  viewingListing.listing_type ||
                                  'SALE'
                                )
                                  .trim()
                                  .toUpperCase()
                            )?.label ||
                            'For Sale'
                          }
                        </strong>

                      </div>

                      <div>

                        <span>
                          Condition
                        </span>

                        <strong>
                          {
                            formatCondition(
                              viewingListing.condition
                            )
                          }
                        </strong>

                      </div>

                      <div>

                        <span>
                          Size
                        </span>

                        <strong>
                          {
                            viewingListing.size ||
                            '—'
                          }
                        </strong>

                      </div>

                      <div>

                        <span>
                          Quantity
                        </span>

                        <strong>
                          {
                            viewingListing.quantity ??
                            0
                          }
                        </strong>

                      </div>

                      <div>

                        <span>
                          Location
                        </span>

                        <strong>
                          {
                            viewingListing.location ||
                            '—'
                          }
                        </strong>

                      </div>

                    </div>

                    <div className="seller-view-description">

                      <span>
                        Description
                      </span>

                      <p>
                        {
                          viewingListing.description ||
                          'No description provided.'
                        }
                      </p>

                    </div>

                  </div>

                </div>

                <div className="seller-listing-modal-footer">

                  <button
                    type="button"
                    className="cancel-listing-button"
                    onClick={() =>
                      setViewingListing(
                        null
                      )
                    }
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    className="save-listing-button"
                    onClick={() => {

                      const listing =
                        viewingListing;

                      setViewingListing(
                        null
                      );

                      openEditForm(
                        listing
                      );

                    }}
                  >

                    <Edit3
                      size={17}
                    />

                    Edit Listing

                  </button>

                </div>

              </div>

            </div>

          )}

        </main>
      );
    };

    export default SellerMyListings;
