const logger = require('../utils/logger');

class CartManager {
    constructor() {
        // Session-based carts
        this.carts = new Map();
    }

    getCart(sessionId) {
        if (!this.carts.has(sessionId)) {
            this.carts.set(sessionId, []);
        }
        return this.carts.get(sessionId);
    }

    addToCart(sessionId, product) {
        const cart = this.getCart(sessionId);
        
        // Check if product already exists
        const existingItem = cart.find(item => item.id === product.id);
        
        if (existingItem) {
            existingItem.quantity += 1;
            logger.info(`Increased quantity for ${product.name} in cart`, { sessionId, quantity: existingItem.quantity });
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                category: product.category,
                quantity: 1
            });
            logger.info(`Added ${product.name} to cart`, { sessionId });
        }
        
        return cart;
    }

    removeFromCart(sessionId, productIdentifier) {
        const cart = this.getCart(sessionId);
        const lowerIdentifier = productIdentifier.toLowerCase();
        
        // Find item with flexible matching
        const itemIndex = cart.findIndex(item => {
            const itemNameLower = item.name.toLowerCase();
            
            // Exact match or contains
            if (itemNameLower.includes(lowerIdentifier) || lowerIdentifier.includes(itemNameLower)) {
                return true;
            }
            
            // Brand/word matching
            const itemWords = itemNameLower.split(/[\s-]+/);
            const searchWords = lowerIdentifier.split(/[\s-]+/);
            
            // Check if any search word matches any item word
            return searchWords.some(searchWord => 
                itemWords.some(itemWord => 
                    itemWord.includes(searchWord) || searchWord.includes(itemWord)
                )
            );
        });
        
        if (itemIndex !== -1) {
            const removed = cart.splice(itemIndex, 1)[0];
            logger.info(`Removed ${removed.name} from cart`, { sessionId });
            return removed;
        }
        
        return null;
    }

    getCartTotal(sessionId) {
        const cart = this.getCart(sessionId);
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    clearCart(sessionId) {
        this.carts.set(sessionId, []);
        logger.info('Cart cleared', { sessionId });
    }

    // Get cart summary for display
    getCartSummary(sessionId) {
        const cart = this.getCart(sessionId);
        
        if (cart.length === 0) {
            return {
                empty: true,
                message: 'Your cart is empty. Add products using "add [product name] to cart".'
            };
        }
        
        const total = this.getCartTotal(sessionId);
        const items = cart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.price * item.quantity
        }));
        
        return {
            empty: false,
            items: items,
            total: total,
            itemCount: cart.reduce((count, item) => count + item.quantity, 0)
        };
    }
}

// Export singleton instance
module.exports = new CartManager();