
class LocalDB {
    constructor(prefix = 'doceControle_') {
        this.prefix = prefix;
    }

    save(key, data) {
        try {
            // Se for string, salva direto. Se objeto, stringify.
            const value = typeof data === 'string' ? data : JSON.stringify(data);
            localStorage.setItem(this.prefix + key, value);
            // Console log removed to avoid spam
            return true;
        } catch (e) {
            console.error(`[DB] Error saving ${key}:`, e);
            return false;
        }
    }

    get(key, defaultValue = null) {
        try {
            // Tenta buscar com prefixo primeiro (novo padrão)
            let item = localStorage.getItem(this.prefix + key);

            // Fallback: Tenta buscar sem prefixo (legado)
            if (item === null) {
                item = localStorage.getItem(key);
            }

            if (item === null) return defaultValue;

            // Tenta fazer parse JSON
            try {
                return JSON.parse(item);
            } catch {
                return item; // Retorna string se não for JSON válido
            }
        } catch (e) {
            console.error(`[DB] Error loading ${key}:`, e);
            return defaultValue;
        }
    }

    remove(key) {
        localStorage.removeItem(this.prefix + key);
    }

    saveSystemData(data) {
        return this.save('dados', data);
    }

    getSystemData() {
        return this.get('dados');
    }

    // User Management
    saveUsers(users) {
        return this.save('users', users);
    }

    getUsers() {
        return this.get('users', []); // Default to empty array if no users found
    }
}

// Global instance
const db = new LocalDB();
