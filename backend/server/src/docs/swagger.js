export const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "BlockPay Complete API Ecosystem",
    version: "2.0.0",
    description:
      "Exhaustive OpenAPI 3.0 specification covering 100% of all 52 API endpoints across Customer Wallets, P2P Transfers, QR Payments, Merchant Platform, POS Cashiers, Developer Gateway, Blockchain Receipts, and Super Admin Authority Governance.",
    contact: {
      name: "BlockPay Developer Support",
      url: "https://blockpay.dev"
    }
  },
  servers: [
    {
      url: "http://localhost:5000/api",
      description: "Local Development Server"
    }
  ],
  tags: [
    { name: "Authentication & Profile", description: "Customer & Merchant onboarding, JWT auth, and profile management" },
    { name: "User Search", description: "Search users for peer-to-peer transfers and bill splitting" },
    { name: "Wallets & Balances", description: "Wallet balance queries, P2P transfers, and demo credits" },
    { name: "Transactions & Blockchain", description: "Transaction history, requests, bill splits, and on-chain verification" },
    { name: "QR Code Payments", description: "Dynamic signed QR code generation and parsing" },
    { name: "Friends Management", description: "Manage peer friends list for fast payments" },
    { name: "Notifications", description: "User activity and payment alerts" },
    { name: "Admin Summary", description: "Legacy high-level admin metrics" },
    { name: "Merchant Platform (Store & POS)", description: "Business profiles, API keys, cashier staff, payment links, and bank payouts" },
    { name: "Payment Gateway & Checkout", description: "External developer checkout sessions, idempotency, customer PIN approvals, and refunds" },
    { name: "BlockPay Authority (Super Admin)", description: "System governance, merchant KYC, dispute resolutions, and platform configurations" },
    { name: "System & Architecture", description: "Multi-core clustering health, worker thread crypto pool, circuit breakers, and cache metrics" }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT Token obtained from `/auth/login` or `/auth/register`"
      },
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "Authorization",
        description: "Merchant Secret API Key in format: `Bearer sk_live_...` or header `x-api-key: sk_live_...`"
      },
      PublishableKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "x-publishable-key",
        description: "Merchant Public Key in format: `pk_live_...` for client-side checkout buttons"
      }
    },
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          username: { type: "string" },
          email: { type: "string", format: "email" },
          phone: { type: "string" },
          role: { type: "string", enum: ["student", "admin"] },
          collegeId: { type: "string" },
          bio: { type: "string" }
        }
      },
      Wallet: {
        type: "object",
        properties: {
          balance: { type: "number", example: 9500 },
          walletNumber: { type: "string", example: "BP4856186486" }
        }
      },
      Transaction: {
        type: "object",
        properties: {
          id: { type: "string" },
          amount: { type: "number", example: 450 },
          note: { type: "string" },
          status: { type: "string", enum: ["successful", "pending", "failed"] },
          hash: { type: "string", description: "SHA-256 Receipt Hash" },
          referenceId: { type: "string", example: "BP-01a0d321-..." },
          metadata: { type: "object" }
        }
      },
      Merchant: {
        type: "object",
        properties: {
          id: { type: "string" },
          businessName: { type: "string", example: "Campus Book Store" },
          businessType: { type: "string", enum: ["retail_store", "food_dining", "online_store", "campus_service", "event_organizer"] },
          status: { type: "string", enum: ["pending_verification", "active", "suspended", "rejected"] },
          commissionRate: { type: "number", example: 1.5 },
          walletBalances: {
            type: "object",
            properties: {
              availableBalance: { type: "number", example: 12500 },
              pendingSettlement: { type: "number", example: 3000 },
              totalSettled: { type: "number", example: 45000 }
            }
          }
        }
      },
      MerchantOrder: {
        type: "object",
        properties: {
          orderId: { type: "string", example: "ORD-MUFGH62T-6AFF18" },
          amount: { type: "number", example: 500 },
          feeAmount: { type: "number", example: 7.5 },
          netAmount: { type: "number", example: 492.5 },
          currency: { type: "string", example: "INR" },
          status: { type: "string", enum: ["created", "paid", "refunded", "partially_refunded", "expired"] },
          receiptHash: { type: "string" },
          blockchainTxHash: { type: "string" }
        }
      }
    }
  },
  paths: {
    // ==========================================
    // 0. SYSTEM & OBSERVABILITY
    // ==========================================
    "/health": {
      get: {
        tags: ["System & Architecture"],
        summary: "System Health & Scalability Architecture Status",
        description: "Returns real-time cluster worker PID, uptime, memory, crypto worker pool stats, circuit breaker state, cache metrics, and queue depth.",
        responses: {
          200: {
            description: "System health and cluster metrics",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean", example: true },
                    service: { type: "string", example: "BlockPay API" },
                    pid: { type: "integer", example: 14200 },
                    uptimeSeconds: { type: "integer", example: 450 },
                    cryptoPool: {
                      type: "object",
                      properties: {
                        activeWorkers: { type: "integer", example: 4 },
                        poolSize: { type: "integer", example: 4 },
                        pendingTasksCount: { type: "integer", example: 0 }
                      }
                    },
                    circuitBreaker: {
                      type: "object",
                      properties: {
                        name: { type: "string", example: "Blockchain_RPC" },
                        state: { type: "string", example: "CLOSED" },
                        failureCount: { type: "integer", example: 0 },
                        isAvailable: { type: "boolean", example: true }
                      }
                    },
                    memory: {
                      type: "object",
                      properties: {
                        rssMb: { type: "integer", example: 88 },
                        heapUsedMb: { type: "integer", example: 31 }
                      }
                    },
                    cache: {
                      type: "object",
                      properties: {
                        type: { type: "string", example: "In-Memory LRU" },
                        cachedKeys: { type: "integer", example: 2 },
                        isRedisConnected: { type: "boolean", example: false }
                      }
                    },
                    queue: {
                      type: "object",
                      properties: {
                        pending: { type: "integer", example: 0 },
                        processing: { type: "integer", example: 0 }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },

    // ==========================================
    // 1. AUTHENTICATION & PROFILE
    // ==========================================
    "/auth/register": {
      post: {
        tags: ["Authentication & Profile"],
        summary: "Register new customer or merchant account",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "username", "email", "phone", "password"],
                properties: {
                  name: { type: "string", example: "Alice Johnson" },
                  username: { type: "string", example: "alice_j" },
                  email: { type: "string", example: "alice@campus.dev" },
                  phone: { type: "string", example: "9876543210" },
                  password: { type: "string", example: "Secret@123" },
                  pin: { type: "string", example: "1234", description: "4-digit transaction authorization PIN" },
                  avatar: { type: "string", example: "avatar_2", description: "Avatar preset ID or image URL" }
                }
              }
            }
          }
        },
        responses: {
          201: { description: "User registered with demo balance of ₹10,000" },
          409: { description: "Username or email already taken" }
        }
      }
    },
    "/auth/login": {
      post: {
        tags: ["Authentication & Profile"],
        summary: "Authenticate user and issue JWT",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", example: "alice@campus.dev" },
                  password: { type: "string", example: "Secret@123" }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "Login successful; JWT token returned" },
          401: { description: "Invalid credentials" }
        }
      }
    },
    "/auth/forgot-password": {
      post: {
        tags: ["Authentication & Profile"],
        summary: "Simulate password recovery reset link",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: { email: { type: "string", example: "alice@campus.dev" } }
              }
            }
          }
        },
        responses: { 200: { description: "Password reset link sent (simulated)" } }
      }
    },
    "/auth/profile": {
      get: {
        tags: ["Authentication & Profile"],
        summary: "Get authenticated user profile",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "User profile details" } }
      },
      put: {
        tags: ["Authentication & Profile"],
        summary: "Update user bio and college ID",
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  bio: { type: "string", example: "Blockchain researcher" },
                  collegeId: { type: "string", example: "CS-2026-99" }
                }
              }
            }
          }
        },
        responses: { 200: { description: "Profile updated successfully" } }
      }
    },
    "/auth/change-pin": {
      post: {
        tags: ["Authentication & Profile"],
        summary: "Change 4-digit transaction payment PIN",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["currentPin", "newPin"],
                properties: {
                  currentPin: { type: "string", example: "1234", description: "Current 4-digit PIN" },
                  newPin: { type: "string", example: "5678", description: "New 4-digit PIN" }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "Payment PIN changed successfully" },
          403: { description: "Current PIN is incorrect" }
        }
      }
    },
    "/auth/logout": {
      post: {
        tags: ["Authentication & Profile"],
        summary: "Log out user session",
        responses: { 200: { description: "Logged out message" } }
      }
    },

    // ==========================================
    // 2. USER SEARCH
    // ==========================================
    "/users/search": {
      get: {
        tags: ["User Search"],
        summary: "Search users by username, name or email",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "q", in: "query", required: true, schema: { type: "string" }, description: "Search query" }],
        responses: { 200: { description: "List of matching users" } }
      }
    },

    // ==========================================
    // 3. WALLETS & BALANCES
    // ==========================================
    "/wallet": {
      get: {
        tags: ["Wallets & Balances"],
        summary: "Get current user wallet & balance",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Wallet balance & number" } }
      }
    },
    "/wallet/balance": {
      get: {
        tags: ["Wallets & Balances"],
        summary: "Get wallet balance shortcut",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Current wallet balance" } }
      }
    },
    "/wallet/transfer": {
      post: {
        tags: ["Wallets & Balances"],
        summary: "P2P transfer funds to another user",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["username", "amount", "pin"],
                properties: {
                  username: { type: "string", example: "bob_merchant" },
                  amount: { type: "number", example: 450 },
                  note: { type: "string", example: "Book payment" },
                  pin: { type: "string", example: "1234" }
                }
              }
            }
          }
        },
        responses: { 201: { description: "Transfer completed and anchored on-chain" } }
      }
    },
    "/wallet/deposit-demo": {
      post: {
        tags: ["Wallets & Balances"],
        summary: "Credit demo balance to user wallet",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["amount"],
                properties: { amount: { type: "number", example: 1000 } }
              }
            }
          }
        },
        responses: { 200: { description: "Demo balance credited" } }
      }
    },
    "/wallet/withdraw-demo": {
      post: {
        tags: ["Wallets & Balances"],
        summary: "Withdraw demo balance from user wallet",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["amount"],
                properties: { amount: { type: "number", example: 500 } }
              }
            }
          }
        },
        responses: { 200: { description: "Demo balance deducted" } }
      }
    },

    // ==========================================
    // 4. TRANSACTIONS & BLOCKCHAIN
    // ==========================================
    "/transactions": {
      get: {
        tags: ["Transactions & Blockchain"],
        summary: "List user transaction history with pagination",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
          { name: "type", in: "query", schema: { type: "string", enum: ["all", "sent", "received"] } }
        ],
        responses: { 200: { description: "Paginated transactions list" } }
      }
    },
    "/transactions/send": {
      post: {
        tags: ["Transactions & Blockchain"],
        summary: "Send payment alias endpoint",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["username", "amount", "pin"],
                properties: {
                  username: { type: "string", example: "bob_merchant" },
                  amount: { type: "number", example: 100 },
                  pin: { type: "string", example: "1234" }
                }
              }
            }
          }
        },
        responses: { 201: { description: "Payment sent" } }
      }
    },
    "/transactions/{id}": {
      get: {
        tags: ["Transactions & Blockchain"],
        summary: "Get single transaction receipt by ID",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Transaction details and receipt hash" } }
      }
    },
    "/transactions/{id}/blockchain/verify": {
      get: {
        tags: ["Transactions & Blockchain"],
        summary: "Verify transaction receipt on Ethereum / Solidity contract",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "On-chain verification status and block number" } }
      }
    },
    "/transactions/{id}/blockchain/retry": {
      post: {
        tags: ["Transactions & Blockchain"],
        summary: "Retry anchoring failed receipt to blockchain",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Retry attempt submitted" } }
      }
    },
    "/transactions/request": {
      post: {
        tags: ["Transactions & Blockchain"],
        summary: "Request payment from another user",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["username", "amount"],
                properties: {
                  username: { type: "string", example: "alice_j" },
                  amount: { type: "number", example: 250 },
                  note: { type: "string", example: "Dinner split" }
                }
              }
            }
          }
        },
        responses: { 201: { description: "Payment request created" } }
      }
    },
    "/transactions/requests": {
      get: {
        tags: ["Transactions & Blockchain"],
        summary: "List pending and accepted payment requests",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "List of payment requests" } }
      }
    },
    "/transactions/accept/{id}": {
      post: {
        tags: ["Transactions & Blockchain"],
        summary: "Accept payment request & transfer funds",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["pin"],
                properties: { pin: { type: "string", example: "1234" } }
              }
            }
          }
        },
        responses: { 201: { description: "Request accepted and funds transferred" } }
      }
    },
    "/transactions/reject/{id}": {
      post: {
        tags: ["Transactions & Blockchain"],
        summary: "Reject incoming payment request",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Payment request rejected" } }
      }
    },
    "/transactions/split": {
      post: {
        tags: ["Transactions & Blockchain"],
        summary: "Create multi-user split bill with per-head division",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "amount", "members"],
                properties: {
                  title: { type: "string", example: "Team Pizza Party" },
                  amount: { type: "number", example: 600 },
                  members: { type: "array", items: { type: "string" }, example: ["alice_j", "bob_merchant"] }
                }
              }
            }
          }
        },
        responses: { 201: { description: "Split bill created with per-head requests" } }
      }
    },

    // ==========================================
    // 5. QR CODE PAYMENTS
    // ==========================================
    "/qr/generate": {
      post: {
        tags: ["QR Code Payments"],
        summary: "Generate dynamic cryptographic payment QR",
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  amount: { type: "number", example: 150 },
                  purpose: { type: "string", example: "Cafeteria Lunch" }
                }
              }
            }
          }
        },
        responses: { 200: { description: "Signed QR payload returned" } }
      }
    },
    "/qr/scan": {
      post: {
        tags: ["QR Code Payments"],
        summary: "Parse and validate scanned QR payload",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["payload"],
                properties: { payload: { type: "string" } }
              }
            }
          }
        },
        responses: { 200: { description: "Parsed merchant/user receiver and amount" } }
      }
    },

    // ==========================================
    // 6. FRIENDS MANAGEMENT
    // ==========================================
    "/friends": {
      get: {
        tags: ["Friends Management"],
        summary: "List user friends",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "List of friends" } }
      },
      post: {
        tags: ["Friends Management"],
        summary: "Add friend by username",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["username"],
                properties: { username: { type: "string", example: "bob_merchant" } }
              }
            }
          }
        },
        responses: { 201: { description: "Friend added" } }
      }
    },
    "/friends/{friendId}": {
      delete: {
        tags: ["Friends Management"],
        summary: "Remove friend from list",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "friendId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 204: { description: "Friend removed" } }
      }
    },

    // ==========================================
    // 7. NOTIFICATIONS
    // ==========================================
    "/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "List user notifications",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Notifications list" } }
      }
    },
    "/notifications/read-all": {
      put: {
        tags: ["Notifications"],
        summary: "Mark all notifications as read",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "All notifications marked read" } }
      }
    },
    "/notifications/{id}/read": {
      put: {
        tags: ["Notifications"],
        summary: "Mark single notification as read",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Notification marked read" } }
      }
    },

    // ==========================================
    // 8. ADMIN SUMMARY
    // ==========================================
    "/admin/summary": {
      get: {
        tags: ["Admin Summary"],
        summary: "Legacy admin metrics summary",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "System stats" } }
      }
    },

    // ==========================================
    // 9. MERCHANT PLATFORM (STORE & POS)
    // ==========================================
    "/merchant/onboard": {
      post: {
        tags: ["Merchant Platform (Store & POS)"],
        summary: "Register store and auto-generate API keys",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["businessName", "contactEmail", "contactPhone"],
                properties: {
                  businessName: { type: "string", example: "Campus Central Bakery" },
                  businessType: { type: "string", enum: ["retail_store", "food_dining", "online_store", "campus_service", "event_organizer"] },
                  contactEmail: { type: "string", example: "bakery@campus.dev" },
                  contactPhone: { type: "string", example: "9876500000" },
                  upiId: { type: "string", example: "bakery@upi" }
                }
              }
            }
          }
        },
        responses: { 201: { description: "Merchant onboarded; public and secret API keys generated" } }
      }
    },
    "/merchant/profile": {
      get: {
        tags: ["Merchant Platform (Store & POS)"],
        summary: "Get merchant profile, status & balance",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Merchant details" } }
      },
      put: {
        tags: ["Merchant Platform (Store & POS)"],
        summary: "Update store profile & webhook URL",
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  businessName: { type: "string" },
                  description: { type: "string" },
                  webhookUrl: { type: "string", format: "uri" },
                  upiId: { type: "string" }
                }
              }
            }
          }
        },
        responses: { 200: { description: "Profile updated" } }
      }
    },
    "/merchant/analytics": {
      get: {
        tags: ["Merchant Platform (Store & POS)"],
        summary: "Get merchant sales volume and balance metrics",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Merchant analytics" } }
      }
    },
    "/merchant/api-keys": {
      post: {
        tags: ["Merchant Platform (Store & POS)"],
        summary: "Create new API Key pair",
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { name: { type: "string", example: "Website Checkout Key" } }
              }
            }
          }
        },
        responses: { 201: { description: "API Key pair generated" } }
      },
      get: {
        tags: ["Merchant Platform (Store & POS)"],
        summary: "List merchant API keys",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "List of active API keys" } }
      }
    },
    "/merchant/api-keys/{id}": {
      delete: {
        tags: ["Merchant Platform (Store & POS)"],
        summary: "Revoke an API key",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "API key revoked" } }
      }
    },
    "/merchant/payment-links": {
      post: {
        tags: ["Merchant Platform (Store & POS)"],
        summary: "Create shareable quick-pay link",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title"],
                properties: {
                  title: { type: "string", example: "Fest Entry Pass" },
                  amount: { type: "number", example: 250 },
                  isReusable: { type: "boolean", default: true }
                }
              }
            }
          }
        },
        responses: { 201: { description: "Payment link created" } }
      },
      get: {
        tags: ["Merchant Platform (Store & POS)"],
        summary: "List merchant payment links",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "List of payment links" } }
      }
    },
    "/merchant/payouts": {
      post: {
        tags: ["Merchant Platform (Store & POS)"],
        summary: "Request withdrawal to Bank Account or UPI",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["amount", "accountDetails"],
                properties: {
                  amount: { type: "number", example: 1000 },
                  destinationType: { type: "string", enum: ["bank_account", "upi"] },
                  accountDetails: { type: "string", example: "store@upi" }
                }
              }
            }
          }
        },
        responses: { 201: { description: "Payout request submitted" } }
      },
      get: {
        tags: ["Merchant Platform (Store & POS)"],
        summary: "List merchant payout history",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Payout history" } }
      }
    },
    "/merchant/staff": {
      post: {
        tags: ["Merchant Platform (Store & POS)"],
        summary: "Add cashier staff assigned to POS counter",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["username", "counterName"],
                properties: {
                  username: { type: "string", example: "cashier_1" },
                  counterName: { type: "string", example: "Billing Counter #1" },
                  role: { type: "string", enum: ["cashier", "manager"], default: "cashier" }
                }
              }
            }
          }
        },
        responses: { 201: { description: "Staff cashier added" } }
      },
      get: {
        tags: ["Merchant Platform (Store & POS)"],
        summary: "List all assigned cashiers & staff",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Staff list" } }
      }
    },
    "/merchant/staff/{id}": {
      delete: {
        tags: ["Merchant Platform (Store & POS)"],
        summary: "Remove cashier staff member",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Staff member removed" } }
      }
    },

    // ==========================================
    // 10. PAYMENT GATEWAY & CHECKOUT
    // ==========================================
    "/v1/checkout/orders": {
      post: {
        tags: ["Payment Gateway & Checkout"],
        summary: "Developer Gateway: Create checkout session",
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: "Idempotency-Key",
            in: "header",
            required: false,
            schema: { type: "string" },
            description: "Unique token to prevent duplicate billing"
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["amount"],
                properties: {
                  amount: { type: "number", example: 500 },
                  currency: { type: "string", default: "INR" },
                  description: { type: "string", example: "Order #4092 - 2 Books" },
                  merchantReference: { type: "string", example: "INV-4092" },
                  customerEmail: { type: "string", example: "customer@campus.dev" }
                }
              }
            }
          }
        },
        responses: { 201: { description: "Order created with checkout URL" } }
      }
    },
    "/v1/checkout/orders/{id}": {
      get: {
        tags: ["Payment Gateway & Checkout"],
        summary: "Developer Gateway: Query order status",
        security: [{ ApiKeyAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Order status" } }
      }
    },
    "/v1/checkout/session/{orderId}": {
      get: {
        tags: ["Payment Gateway & Checkout"],
        summary: "Public checkout session UI data",
        parameters: [{ name: "orderId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Order checkout information" } }
      }
    },
    "/v1/checkout/pay": {
      post: {
        tags: ["Payment Gateway & Checkout"],
        summary: "Customer payment approval with PIN",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "Idempotency-Key",
            in: "header",
            required: false,
            schema: { type: "string" }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["orderId", "pin"],
                properties: {
                  orderId: { type: "string", example: "ORD-MUFGH62T-6AFF18" },
                  pin: { type: "string", example: "1234" }
                }
              }
            }
          }
        },
        responses: { 200: { description: "Payment approved, split, and anchored to smart contract" } }
      }
    },
    "/v1/checkout/orders/{id}/refund": {
      post: {
        tags: ["Payment Gateway & Checkout"],
        summary: "Full or partial refund for merchant order",
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "Idempotency-Key", in: "header", schema: { type: "string" } }
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  amount: { type: "number", example: 100, description: "Leave empty for full refund" },
                  reason: { type: "string", example: "Item out of stock" }
                }
              }
            }
          }
        },
        responses: { 200: { description: "Refund processed and anchored on-chain" } }
      }
    },
    "/v1/checkout/links/{linkId}": {
      get: {
        tags: ["Payment Gateway & Checkout"],
        summary: "Public shareable payment link data",
        parameters: [{ name: "linkId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Payment link details" } }
      }
    },

    // ==========================================
    // 11. BLOCKPAY AUTHORITY (SUPER ADMIN)
    // ==========================================
    "/authority/dashboard": {
      get: {
        tags: ["BlockPay Authority (Super Admin)"],
        summary: "Global system performance & GMV dashboard",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Global metrics" } }
      }
    },
    "/authority/users": {
      get: {
        tags: ["BlockPay Authority (Super Admin)"],
        summary: "360-degree customer & user explorer with live balances",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "All users with live balances" } }
      }
    },
    "/authority/transactions": {
      get: {
        tags: ["BlockPay Authority (Super Admin)"],
        summary: "Global transaction ledger explorer across all users and merchants",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "All system transactions with blockchain hashes" } }
      }
    },
    "/authority/merchants": {
      get: {
        tags: ["BlockPay Authority (Super Admin)"],
        summary: "List all merchants with status filters",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "status", in: "query", schema: { type: "string", enum: ["pending_verification", "active", "suspended"] } }],
        responses: { 200: { description: "List of merchants" } }
      }
    },
    "/authority/merchants/{id}": {
      get: {
        tags: ["BlockPay Authority (Super Admin)"],
        summary: "360-degree single merchant deep dive (orders, staff, payouts)",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Complete merchant details" } }
      }
    },
    "/authority/merchants/{id}/verify": {
      patch: {
        tags: ["BlockPay Authority (Super Admin)"],
        summary: "Approve merchant KYC application",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Merchant verified and activated" } }
      }
    },
    "/authority/merchants/{id}/suspend": {
      patch: {
        tags: ["BlockPay Authority (Super Admin)"],
        summary: "Freeze / Suspend merchant operations",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Merchant suspended" } }
      }
    },
    "/authority/payouts": {
      get: {
        tags: ["BlockPay Authority (Super Admin)"],
        summary: "List all platform payouts across all merchants",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "status", in: "query", schema: { type: "string" } }],
        responses: { 200: { description: "List of payouts" } }
      }
    },
    "/authority/payouts/{id}/approve": {
      patch: {
        tags: ["BlockPay Authority (Super Admin)"],
        summary: "Approve merchant bank settlement payout",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Payout marked completed with UTR reference" } }
      }
    },
    "/authority/disputes": {
      get: {
        tags: ["BlockPay Authority (Super Admin)"],
        summary: "List customer disputes and chargebacks",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "status", in: "query", schema: { type: "string" } }],
        responses: { 200: { description: "List of disputes" } }
      }
    },
    "/authority/disputes/{id}/resolve": {
      post: {
        tags: ["BlockPay Authority (Super Admin)"],
        summary: "Resolve customer dispute (refund or dismiss)",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["resolution", "resolutionNotes"],
                properties: {
                  resolution: { type: "string", enum: ["refund", "reject"] },
                  resolutionNotes: { type: "string", example: "Evidence reviewed, customer provided receipt" }
                }
              }
            }
          }
        },
        responses: { 200: { description: "Dispute resolved" } }
      }
    },
    "/authority/config": {
      get: {
        tags: ["BlockPay Authority (Super Admin)"],
        summary: "Get runtime platform configuration",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Current platform config" } }
      },
      put: {
        tags: ["BlockPay Authority (Super Admin)"],
        summary: "Update platform commission rate, caps, or maintenance mode",
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  defaultCommissionRate: { type: "number", example: 1.5 },
                  maxTransferLimit: { type: "number", example: 30000 },
                  dailyUserLimit: { type: "number", example: 50000 },
                  maintenanceMode: { type: "boolean" }
                }
              }
            }
          }
        },
        responses: { 200: { description: "Config updated and recorded in audit log" } }
      }
    },
    "/authority/audit-logs": {
      get: {
        tags: ["BlockPay Authority (Super Admin)"],
        summary: "View immutable administrative audit trail",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Chronological audit logs" } }
      }
    }
  }
};
